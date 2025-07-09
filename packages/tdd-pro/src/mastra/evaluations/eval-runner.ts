import { EvaluationResult } from "@mastra/core";
import { runRefinementAgentEvaluations } from "./refinement-suite";
import { RefinementPerformanceTracker } from "./performance-tracker";
import { exportEvaluationResults } from "./ui-integration";
import fs from "fs/promises";
import path from "path";

export interface EvalRunConfig {
  cwd: string;
  runId?: string;
  outputPath?: string;
  trackPerformance?: boolean;
  saveResults?: boolean;
}

export interface EvalRunResult {
  runId: string;
  timestamp: string;
  results: EvaluationResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    averageScore: number;
    passRate: number;
  };
  performanceMetrics?: any;
  outputFiles?: string[];
}

export class EvaluationRunner {
  private tracker: RefinementPerformanceTracker;
  private runHistory: Map<string, EvalRunResult> = new Map();

  constructor() {
    this.tracker = new RefinementPerformanceTracker();
  }

  async runEvaluations(config: EvalRunConfig): Promise<EvalRunResult> {
    const runId = config.runId || `eval-run-${Date.now()}`;
    const timestamp = new Date().toISOString();

    console.log(`🚀 Starting evaluation run: ${runId}`);
    console.log(`📁 Working directory: ${config.cwd}`);

    try {
      // Run the evaluation suite
      const results = await runRefinementAgentEvaluations({
        cwd: config.cwd,
        globalRunId: runId
      });

      // Calculate summary metrics
      const summary = this.calculateSummary(results);
      
      // Track performance if enabled
      let performanceMetrics;
      if (config.trackPerformance) {
        await this.tracker.recordEvaluationRun(runId, results);
        performanceMetrics = await this.tracker.getPerformanceMetrics(runId);
      }

      // Save results if enabled
      let outputFiles: string[] = [];
      if (config.saveResults) {
        outputFiles = await this.saveResults(runId, results, config.outputPath || config.cwd);
      }

      const evalResult: EvalRunResult = {
        runId,
        timestamp,
        results,
        summary,
        performanceMetrics,
        outputFiles
      };

      // Store in history
      this.runHistory.set(runId, evalResult);

      // Log summary
      this.logSummary(evalResult);

      return evalResult;
    } catch (error) {
      console.error(`❌ Evaluation run failed: ${error}`);
      throw error;
    }
  }

  async runContinuousEvaluations(config: EvalRunConfig, intervalMinutes: number = 60): Promise<void> {
    console.log(`🔄 Starting continuous evaluations every ${intervalMinutes} minutes`);
    
    const runEval = async () => {
      try {
        const result = await this.runEvaluations({
          ...config,
          runId: `continuous-${Date.now()}`,
          trackPerformance: true,
          saveResults: true
        });

        // Check for performance degradation
        await this.checkPerformanceTrends(result);
      } catch (error) {
        console.error(`❌ Continuous evaluation failed: ${error}`);
      }
    };

    // Run immediately
    await runEval();

    // Schedule subsequent runs
    setInterval(runEval, intervalMinutes * 60 * 1000);
  }

  async compareRuns(runId1: string, runId2: string): Promise<{
    scoreComparison: { metric: string; run1: number; run2: number; change: number }[];
    performanceChanges: string[];
    recommendations: string[];
  }> {
    const run1 = this.runHistory.get(runId1);
    const run2 = this.runHistory.get(runId2);

    if (!run1 || !run2) {
      throw new Error("One or both run IDs not found in history");
    }

    // Compare scores by test type
    const scoreComparison = this.compareScoresByMetric(run1.results, run2.results);
    
    // Analyze performance changes
    const performanceChanges = this.analyzePerformanceChanges(run1, run2);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(scoreComparison, performanceChanges);

    return { scoreComparison, performanceChanges, recommendations };
  }

  async getRunHistory(limit: number = 10): Promise<EvalRunResult[]> {
    const runs = Array.from(this.runHistory.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    
    return runs;
  }

  async generateReport(runId: string, format: 'json' | 'markdown' | 'html' = 'markdown'): Promise<string> {
    const run = this.runHistory.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(run, null, 2);
      case 'markdown':
        return this.generateMarkdownReport(run);
      case 'html':
        return this.generateHtmlReport(run);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private calculateSummary(results: EvaluationResult[]) {
    const totalTests = results.length;
    const passed = results.filter(r => r.score >= 70).length;
    const failed = totalTests - passed;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalTests;
    const passRate = (passed / totalTests) * 100;

    return {
      totalTests,
      passed,
      failed,
      averageScore: Math.round(averageScore),
      passRate: Math.round(passRate)
    };
  }

  private async saveResults(runId: string, results: EvaluationResult[], outputPath: string): Promise<string[]> {
    const outputFiles: string[] = [];
    
    try {
      // Ensure output directory exists
      const evalDir = path.join(outputPath, '.tdd-pro', 'evaluations');
      await fs.mkdir(evalDir, { recursive: true });

      // Save raw results
      const resultsFile = path.join(evalDir, `${runId}-results.json`);
      await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
      outputFiles.push(resultsFile);

      // Save UI export data
      const uiData = await exportEvaluationResults(results);
      const uiFile = path.join(evalDir, `${runId}-ui-data.json`);
      await fs.writeFile(uiFile, JSON.stringify(uiData, null, 2));
      outputFiles.push(uiFile);

      // Save summary report
      const summary = this.calculateSummary(results);
      const reportFile = path.join(evalDir, `${runId}-report.md`);
      const report = this.generateMarkdownReport({ 
        runId, 
        timestamp: new Date().toISOString(), 
        results, 
        summary 
      } as EvalRunResult);
      await fs.writeFile(reportFile, report);
      outputFiles.push(reportFile);

      console.log(`💾 Results saved to: ${evalDir}`);
    } catch (error) {
      console.error(`❌ Failed to save results: ${error}`);
    }

    return outputFiles;
  }

  private logSummary(result: EvalRunResult): void {
    console.log('\n📊 Evaluation Summary:');
    console.log(`   Run ID: ${result.runId}`);
    console.log(`   Tests: ${result.summary.totalTests}`);
    console.log(`   Passed: ${result.summary.passed} (${result.summary.passRate}%)`);
    console.log(`   Failed: ${result.summary.failed}`);
    console.log(`   Average Score: ${result.summary.averageScore}`);
    
    if (result.performanceMetrics) {
      console.log(`   Trend: ${result.performanceMetrics.improvementTrend}`);
    }

    // Highlight failing tests
    const failingTests = result.results.filter(r => r.score < 70);
    if (failingTests.length > 0) {
      console.log('\n❌ Failing Tests:');
      failingTests.forEach(test => {
        console.log(`   - ${test.testInfo?.testName}: ${test.score}/100`);
      });
    }

    // Highlight top performers
    const topTests = result.results
      .filter(r => r.score >= 90)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    if (topTests.length > 0) {
      console.log('\n✅ Top Performing Tests:');
      topTests.forEach(test => {
        console.log(`   - ${test.testInfo?.testName}: ${test.score}/100`);
      });
    }
  }

  private compareScoresByMetric(results1: EvaluationResult[], results2: EvaluationResult[]) {
    const metrics = new Map<string, { run1: number; run2: number }>();

    // Group by test name/metric
    results1.forEach(r => {
      if (r.testInfo?.testName) {
        metrics.set(r.testInfo.testName, { run1: r.score, run2: 0 });
      }
    });

    results2.forEach(r => {
      if (r.testInfo?.testName) {
        const existing = metrics.get(r.testInfo.testName);
        if (existing) {
          existing.run2 = r.score;
        } else {
          metrics.set(r.testInfo.testName, { run1: 0, run2: r.score });
        }
      }
    });

    return Array.from(metrics.entries()).map(([metric, scores]) => ({
      metric,
      run1: scores.run1,
      run2: scores.run2,
      change: scores.run2 - scores.run1
    }));
  }

  private analyzePerformanceChanges(run1: EvalRunResult, run2: EvalRunResult): string[] {
    const changes: string[] = [];
    
    const scoreDiff = run2.summary.averageScore - run1.summary.averageScore;
    if (scoreDiff > 5) {
      changes.push(`Average score improved by ${scoreDiff} points`);
    } else if (scoreDiff < -5) {
      changes.push(`Average score declined by ${Math.abs(scoreDiff)} points`);
    }

    const passRateDiff = run2.summary.passRate - run1.summary.passRate;
    if (passRateDiff > 10) {
      changes.push(`Pass rate improved by ${passRateDiff}%`);
    } else if (passRateDiff < -10) {
      changes.push(`Pass rate declined by ${Math.abs(passRateDiff)}%`);
    }

    return changes;
  }

  private generateRecommendations(scoreComparison: any[], performanceChanges: string[]): string[] {
    const recommendations: string[] = [];

    // Analyze score trends
    const declining = scoreComparison.filter(s => s.change < -10);
    const improving = scoreComparison.filter(s => s.change > 10);

    if (declining.length > 0) {
      recommendations.push(`Focus on improving: ${declining.map(d => d.metric).join(', ')}`);
    }

    if (improving.length > 0) {
      recommendations.push(`Continue strengths in: ${improving.map(i => i.metric).join(', ')}`);
    }

    if (performanceChanges.some(c => c.includes('declined'))) {
      recommendations.push('Review recent agent changes - performance regression detected');
    }

    return recommendations;
  }

  private async checkPerformanceTrends(result: EvalRunResult): Promise<void> {
    if (result.summary.averageScore < 70) {
      console.log('⚠️  Performance Alert: Average score below threshold (70)');
    }

    if (result.summary.passRate < 80) {
      console.log('⚠️  Performance Alert: Pass rate below 80%');
    }
  }

  private generateMarkdownReport(run: EvalRunResult): string {
    return `# Refinement Agent Evaluation Report

**Run ID:** ${run.runId}  
**Timestamp:** ${run.timestamp}

## Summary
- **Total Tests:** ${run.summary.totalTests}
- **Passed:** ${run.summary.passed} (${run.summary.passRate}%)
- **Failed:** ${run.summary.failed}
- **Average Score:** ${run.summary.averageScore}/100

## Test Results

| Test Name | Score | Status |
|-----------|-------|--------|
${run.results.map(r => 
  `| ${r.testInfo?.testName || 'Unknown'} | ${r.score}/100 | ${r.score >= 70 ? '✅ Pass' : '❌ Fail'} |`
).join('\n')}

## Performance Metrics
${run.performanceMetrics ? `
- **Improvement Trend:** ${run.performanceMetrics.improvementTrend}
- **Strong Areas:** ${run.performanceMetrics.strongAreas.join(', ')}
- **Weak Areas:** ${run.performanceMetrics.weakAreas.join(', ')}
` : 'Performance tracking not enabled'}

## Output Files
${run.outputFiles ? run.outputFiles.map(f => `- ${f}`).join('\n') : 'No files saved'}
`;
  }

  private generateHtmlReport(run: EvalRunResult): string {
    // Simplified HTML report - could be enhanced with charts/styling
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Evaluation Report - ${run.runId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .pass { color: green; }
        .fail { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Refinement Agent Evaluation Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Run ID:</strong> ${run.runId}</p>
        <p><strong>Timestamp:</strong> ${run.timestamp}</p>
        <p><strong>Pass Rate:</strong> ${run.summary.passRate}% (${run.summary.passed}/${run.summary.totalTests})</p>
        <p><strong>Average Score:</strong> ${run.summary.averageScore}/100</p>
    </div>
    
    <h2>Test Results</h2>
    <table>
        <tr><th>Test Name</th><th>Score</th><th>Status</th></tr>
        ${run.results.map(r => `
            <tr>
                <td>${r.testInfo?.testName || 'Unknown'}</td>
                <td>${r.score}/100</td>
                <td class="${r.score >= 70 ? 'pass' : 'fail'}">${r.score >= 70 ? '✅ Pass' : '❌ Fail'}</td>
            </tr>
        `).join('')}
    </table>
</body>
</html>`;
  }
}

// Convenience functions for CLI usage
export async function runEvals(cwd: string, options: Partial<EvalRunConfig> = {}): Promise<EvalRunResult> {
  const runner = new EvaluationRunner();
  return runner.runEvaluations({
    cwd,
    trackPerformance: true,
    saveResults: true,
    ...options
  });
}

export async function startContinuousEvals(cwd: string, intervalMinutes: number = 60): Promise<void> {
  const runner = new EvaluationRunner();
  return runner.runContinuousEvaluations({
    cwd,
    trackPerformance: true,
    saveResults: true
  }, intervalMinutes);
}