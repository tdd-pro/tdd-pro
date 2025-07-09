import { EvaluationResult } from "@mastra/core";

interface EvaluationSummary {
  overallScore: number;
  totalEvaluations: number;
  passRate: number; // Percentage of evaluations scoring > 70
  topScenarios: Array<{
    testName: string;
    score: number;
  }>;
  needsImprovement: Array<{
    testName: string;
    score: number;
    suggestions: string[];
  }>;
}

interface DetailsByMetric {
  [metricName: string]: {
    averageScore: number;
    evaluations: Array<{
      testName: string;
      score: number;
      output: string;
      info?: Record<string, any>;
    }>;
  };
}

interface UIExportData {
  summary: EvaluationSummary;
  detailsByMetric: DetailsByMetric;
  timestamp: string;
  chartData: {
    scoreDistribution: Array<{
      range: string;
      count: number;
    }>;
    metricPerformance: Array<{
      metric: string;
      score: number;
    }>;
  };
}

export async function exportEvaluationResults(results: EvaluationResult[]): Promise<UIExportData> {
  // Calculate summary metrics
  const scores = results.map(r => r.score);
  const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const passRate = (scores.filter(s => s >= 70).length / scores.length) * 100;

  // Top performing scenarios
  const topScenarios = results
    .filter(r => r.testInfo?.testName)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => ({
      testName: r.testInfo!.testName!,
      score: r.score
    }));

  // Scenarios needing improvement
  const needsImprovement = results
    .filter(r => r.score < 70 && r.testInfo?.testName)
    .map(r => ({
      testName: r.testInfo!.testName!,
      score: r.score,
      suggestions: generateImprovementSuggestions(r)
    }));

  const summary: EvaluationSummary = {
    overallScore: Math.round(overallScore),
    totalEvaluations: results.length,
    passRate: Math.round(passRate),
    topScenarios,
    needsImprovement
  };

  // Group by metric type (inferred from test names)
  const detailsByMetric: DetailsByMetric = {};
  
  results.forEach(result => {
    if (!result.testInfo?.testName) return;
    
    const metricName = inferMetricName(result.testInfo.testName);
    
    if (!detailsByMetric[metricName]) {
      detailsByMetric[metricName] = {
        averageScore: 0,
        evaluations: []
      };
    }
    
    detailsByMetric[metricName].evaluations.push({
      testName: result.testInfo.testName,
      score: result.score,
      output: result.output,
      info: result.info
    });
  });

  // Calculate average scores for each metric
  Object.keys(detailsByMetric).forEach(metricName => {
    const evaluations = detailsByMetric[metricName].evaluations;
    const avgScore = evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;
    detailsByMetric[metricName].averageScore = Math.round(avgScore);
  });

  // Generate chart data
  const scoreDistribution = [
    { range: "90-100", count: scores.filter(s => s >= 90).length },
    { range: "70-89", count: scores.filter(s => s >= 70 && s < 90).length },
    { range: "50-69", count: scores.filter(s => s >= 50 && s < 70).length },
    { range: "0-49", count: scores.filter(s => s < 50).length }
  ];

  const metricPerformance = Object.keys(detailsByMetric).map(metric => ({
    metric,
    score: detailsByMetric[metric].averageScore
  }));

  return {
    summary,
    detailsByMetric,
    timestamp: new Date().toISOString(),
    chartData: {
      scoreDistribution,
      metricPerformance
    }
  };
}

function inferMetricName(testName: string): string {
  if (testName.includes('TDD coaching') || testName.includes('Beck')) {
    return 'TDD Coaching';
  }
  if (testName.includes('Sandi Metz')) {
    return 'Sandi Metz Rules';
  }
  if (testName.includes('conversation') || testName.includes('quality')) {
    return 'Conversation Quality';
  }
  if (testName.includes('completion')) {
    return 'Feature Completion';
  }
  if (testName.includes('red-green-refactor') || testName.includes('refactor')) {
    return 'TDD Cycle Guidance';
  }
  return 'General';
}

function generateImprovementSuggestions(result: EvaluationResult): string[] {
  const suggestions: string[] = [];
  const testName = result.testInfo?.testName || '';
  
  if (testName.includes('TDD coaching') && result.score < 70) {
    suggestions.push("Include more TDD-specific terminology (red, green, refactor)");
    suggestions.push("Ask more probing questions about test behavior");
    suggestions.push("Reference Kent Beck TDD principles explicitly");
  }
  
  if (testName.includes('Sandi Metz') && result.score < 70) {
    suggestions.push("Improve code violation detection accuracy");
    suggestions.push("Provide specific refactoring suggestions");
    suggestions.push("Mention Sandi Metz rules by name");
  }
  
  if (testName.includes('conversation') && result.score < 70) {
    suggestions.push("Challenge vague descriptions more assertively");
    suggestions.push("Ask more specific follow-up questions");
    suggestions.push("Use coaching language patterns");
  }
  
  if (suggestions.length === 0) {
    suggestions.push("Improve response specificity and technical depth");
  }
  
  return suggestions;
}

// Export function for Mastra UI dashboard integration
export async function generateDashboardData(evaluationResults: EvaluationResult[]): Promise<any> {
  const uiData = await exportEvaluationResults(evaluationResults);
  
  // Format for Mastra dashboard consumption
  return {
    widgets: [
      {
        type: 'metric',
        title: 'Overall Performance',
        value: uiData.summary.overallScore,
        subtitle: `${uiData.summary.passRate}% pass rate`
      },
      {
        type: 'chart',
        title: 'Score Distribution',
        data: uiData.chartData.scoreDistribution,
        chartType: 'bar'
      },
      {
        type: 'chart', 
        title: 'Metric Performance',
        data: uiData.chartData.metricPerformance,
        chartType: 'radar'
      },
      {
        type: 'table',
        title: 'Top Performing Scenarios',
        data: uiData.summary.topScenarios
      },
      {
        type: 'table',
        title: 'Areas for Improvement',
        data: uiData.summary.needsImprovement
      }
    ],
    metadata: {
      lastUpdated: uiData.timestamp,
      totalEvaluations: uiData.summary.totalEvaluations
    }
  };
}