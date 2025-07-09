import { EvaluationResult } from "@mastra/core";

interface PerformanceMetrics {
  averageScore: number;
  improvementTrend: 'improving' | 'declining' | 'stable';
  weakAreas: string[];
  strongAreas: string[];
  totalEvaluations: number;
  scoreDistribution: {
    excellent: number; // 90-100
    good: number;      // 70-89
    fair: number;      // 50-69
    poor: number;      // 0-49
  };
}

interface EvaluationHistory {
  runId: string;
  timestamp: Date;
  results: EvaluationResult[];
  averageScore: number;
}

export class RefinementPerformanceTracker {
  private evaluationHistory: Map<string, EvaluationHistory> = new Map();

  async getPerformanceMetrics(globalRunId?: string): Promise<PerformanceMetrics> {
    // For demo purposes, return mock data
    // In production, this would query actual evaluation results from Mastra storage
    
    const mockHistory: EvaluationHistory[] = [
      {
        runId: "run-1",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        results: [],
        averageScore: 75
      },
      {
        runId: "run-2", 
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        results: [],
        averageScore: 82
      },
      {
        runId: "run-3",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        results: [],
        averageScore: 88
      }
    ];

    // Calculate metrics
    const scores = mockHistory.map(h => h.averageScore);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Determine trend
    let improvementTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (scores.length >= 2) {
      const recent = scores.slice(-2);
      if (recent[1] > recent[0] + 5) improvementTrend = 'improving';
      else if (recent[1] < recent[0] - 5) improvementTrend = 'declining';
    }

    // Mock weak/strong areas based on common patterns
    const weakAreas = averageScore < 80 ? ['Sandi Metz rule detection', 'Vague behavior challenges'] : [];
    const strongAreas = averageScore > 70 ? ['TDD coaching', 'Red-green-refactor guidance'] : [];

    // Score distribution (mock)
    const scoreDistribution = {
      excellent: Math.floor(averageScore > 85 ? 40 : 20),
      good: Math.floor(averageScore > 70 ? 35 : 25), 
      fair: Math.floor(averageScore > 60 ? 20 : 35),
      poor: Math.floor(averageScore < 60 ? 25 : 5)
    };

    return {
      averageScore,
      improvementTrend,
      weakAreas,
      strongAreas,
      totalEvaluations: mockHistory.length * 7, // 7 scenarios per run
      scoreDistribution
    };
  }

  async recordEvaluationRun(runId: string, results: EvaluationResult[]): Promise<void> {
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    this.evaluationHistory.set(runId, {
      runId,
      timestamp: new Date(),
      results,
      averageScore
    });
  }

  async getEvaluationTrends(days: number = 30): Promise<Array<{date: string, score: number}>> {
    // Mock trend data
    const trends = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const score = 70 + Math.random() * 20 + (days - i) * 0.5; // Slightly improving trend
      trends.push({
        date: date.toISOString().split('T')[0],
        score: Math.round(score)
      });
    }
    return trends;
  }

  async getWeakAreaAnalysis(): Promise<Array<{area: string, frequency: number, averageScore: number}>> {
    // Mock weak area analysis
    return [
      {
        area: "Sandi Metz rule detection",
        frequency: 15,
        averageScore: 68
      },
      {
        area: "Feature completion recognition", 
        frequency: 12,
        averageScore: 72
      },
      {
        area: "Vague behavior challenges",
        frequency: 10,
        averageScore: 75
      }
    ];
  }

  async getTopPerformingScenarios(): Promise<Array<{scenario: string, averageScore: number, count: number}>> {
    // Mock top performing scenarios
    return [
      {
        scenario: "TDD coaching - basic guidance",
        averageScore: 92,
        count: 25
      },
      {
        scenario: "Red-green-refactor cycle explanation",
        averageScore: 89,
        count: 20
      },
      {
        scenario: "Code review with violations",
        averageScore: 85,
        count: 18
      }
    ];
  }
}