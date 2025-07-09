import { Metric, MetricResult } from "@mastra/core";

// Feature Breakdown Size Assessment Metric
export class FeatureBreakdownMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      breakdownAssessment: 'unknown',
      complexityIndicators: [],
      recommendations: [],
      taskCount: 0,
      scopeAnalysis: {}
    };

    // Analyze input feature complexity
    const complexitySignals = this.analyzeFeatureComplexity(input);
    const agentResponse = this.analyzeAgentResponse(output);
    
    // Evaluate breakdown appropriateness
    const breakdownScore = this.evaluateBreakdown(complexitySignals, agentResponse, info);
    score += breakdownScore;

    // Check for proper task sizing guidance
    const taskSizingScore = this.evaluateTaskSizing(output, info);
    score += taskSizingScore;

    // Evaluate vertical slice recommendations
    const verticalSliceScore = this.evaluateVerticalSlices(output, info);
    score += verticalSliceScore;

    score = Math.min(score, 100);
    return { score, info };
  }

  private analyzeFeatureComplexity(input: string): {
    complexity: 'simple' | 'medium' | 'complex';
    indicators: string[];
    estimatedTasks: number;
  } {
    const indicators: string[] = [];
    let complexityPoints = 0;

    // Complexity indicators
    const complexPatterns = [
      { pattern: /multiple.*systems?|integration/i, points: 2, name: 'system-integration' },
      { pattern: /database|persistence|storage/i, points: 1, name: 'data-persistence' },
      { pattern: /authentication|authorization|security/i, points: 2, name: 'security-concerns' },
      { pattern: /real-time|websocket|streaming/i, points: 3, name: 'real-time' },
      { pattern: /payment|billing|transaction/i, points: 3, name: 'financial' },
      { pattern: /email|notification|messaging/i, points: 1, name: 'messaging' },
      { pattern: /search|filtering|sorting/i, points: 1, name: 'data-operations' },
      { pattern: /admin|dashboard|reporting/i, points: 2, name: 'admin-interface' },
      { pattern: /mobile|responsive|cross-platform/i, points: 2, name: 'multi-platform' },
      { pattern: /api|microservice|service/i, points: 2, name: 'service-architecture' }
    ];

    complexPatterns.forEach(({ pattern, points, name }) => {
      if (pattern.test(input)) {
        complexityPoints += points;
        indicators.push(name);
      }
    });

    // Estimate optimal task count based on complexity
    let estimatedTasks: number;
    let complexity: 'simple' | 'medium' | 'complex';

    if (complexityPoints <= 2) {
      complexity = 'simple';
      estimatedTasks = 3; // 2-4 tasks
    } else if (complexityPoints <= 5) {
      complexity = 'medium';
      estimatedTasks = 6; // 4-8 tasks
    } else {
      complexity = 'complex';
      estimatedTasks = 10; // 8-12 tasks
    }

    return { complexity, indicators, estimatedTasks };
  }

  private analyzeAgentResponse(output: string): {
    suggestedBreakdown: 'too-fine' | 'appropriate' | 'too-coarse' | 'missing';
    taskCount: number;
    hasVerticalSlices: boolean;
    hasTestingStrategy: boolean;
  } {
    // Count suggested tasks/steps
    const taskPatterns = [
      /(\d+)\.\s/g, // numbered lists
      /[-*]\s/g,    // bullet points
      /step\s+\d+/gi, // explicit steps
      /task\s+\d+/gi  // explicit tasks
    ];

    let taskCount = 0;
    taskPatterns.forEach(pattern => {
      const matches = output.match(pattern);
      if (matches) taskCount = Math.max(taskCount, matches.length);
    });

    // Detect breakdown patterns
    const hasVerticalSlices = /vertical.*slice|end.*to.*end|feature.*slice|minimal.*viable/i.test(output);
    const hasTestingStrategy = /test.*strategy|test.*plan|testing.*approach/i.test(output);

    // Assess breakdown granularity
    let suggestedBreakdown: 'too-fine' | 'appropriate' | 'too-coarse' | 'missing';
    if (taskCount === 0) {
      suggestedBreakdown = 'missing';
    } else if (taskCount > 15) {
      suggestedBreakdown = 'too-fine';
    } else if (taskCount < 2) {
      suggestedBreakdown = 'too-coarse';
    } else {
      suggestedBreakdown = 'appropriate';
    }

    return { suggestedBreakdown, taskCount, hasVerticalSlices, hasTestingStrategy };
  }

  private evaluateBreakdown(
    complexity: ReturnType<FeatureBreakdownMetric['analyzeFeatureComplexity']>,
    response: ReturnType<FeatureBreakdownMetric['analyzeAgentResponse']>,
    info: Record<string, any>
  ): number {
    let score = 0;
    info.complexityIndicators = complexity.indicators;
    info.taskCount = response.taskCount;
    info.breakdownAssessment = response.suggestedBreakdown;

    // Score based on breakdown appropriateness
    const taskDiff = Math.abs(response.taskCount - complexity.estimatedTasks);
    const taskRatio = taskDiff / complexity.estimatedTasks;

    if (response.suggestedBreakdown === 'appropriate' && taskRatio <= 0.3) {
      score += 40; // Perfect breakdown
      info.recommendations.push('Excellent task breakdown for complexity level');
    } else if (response.suggestedBreakdown === 'too-fine') {
      score += 20; // Over-breakdown penalty
      info.recommendations.push('Consider consolidating micro-tasks into meaningful units');
    } else if (response.suggestedBreakdown === 'too-coarse') {
      score += 15; // Under-breakdown penalty
      info.recommendations.push('Break down large tasks into smaller, testable units');
    } else if (response.suggestedBreakdown === 'missing') {
      score += 5; // No breakdown penalty
      info.recommendations.push('Provide clear task breakdown for implementation');
    }

    // Complexity alignment bonus
    if (complexity.complexity === 'complex' && response.taskCount >= 8) {
      score += 10;
      info.recommendations.push('Good recognition of complex feature needs');
    }

    return score;
  }

  private evaluateTaskSizing(output: string, info: Record<string, any>): number {
    let score = 0;

    // Check for task sizing principles
    const sizingPrinciples = [
      { pattern: /2.*hour|half.*day|small.*task/i, points: 10, name: 'small-task-sizing' },
      { pattern: /story.*point|estimate|complexity/i, points: 8, name: 'estimation-awareness' },
      { pattern: /atomic|single.*responsibility|one.*thing/i, points: 12, name: 'atomic-tasks' },
      { pattern: /testable.*unit|test.*boundary|test.*scope/i, points: 15, name: 'test-driven-sizing' },
      { pattern: /demo.*able|deliverable|shippable/i, points: 10, name: 'value-oriented' }
    ];

    sizingPrinciples.forEach(({ pattern, points, name }) => {
      if (pattern.test(output)) {
        score += points;
        info.recommendations.push(`Good: ${name} principle mentioned`);
      }
    });

    return Math.min(score, 30);
  }

  private evaluateVerticalSlices(output: string, info: Record<string, any>): number {
    let score = 0;

    // Check for vertical slice thinking
    const verticalSliceIndicators = [
      { pattern: /vertical.*slice|end.*to.*end/i, points: 20, name: 'vertical-slice-concept' },
      { pattern: /minimal.*viable|simplest.*path|walking.*skeleton/i, points: 15, name: 'mvp-thinking' },
      { pattern: /full.*flow|complete.*journey|user.*path/i, points: 12, name: 'user-journey' },
      { pattern: /infrastructure.*first|foundation.*layer/i, points: -10, name: 'horizontal-layering' },
      { pattern: /database.*first|schema.*design/i, points: -8, name: 'data-first-antipattern' }
    ];

    verticalSliceIndicators.forEach(({ pattern, points, name }) => {
      if (pattern.test(output)) {
        score += points;
        if (points > 0) {
          info.recommendations.push(`Excellent: ${name} approach`);
        } else {
          info.recommendations.push(`Warning: ${name} detected - consider vertical slices instead`);
        }
      }
    });

    return Math.max(0, Math.min(score, 30));
  }
}

// Task Granularity Assessment Metric
export class TaskGranularityMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      granularityLevel: 'unknown',
      taskTypes: [],
      antiPatterns: [],
      recommendations: []
    };

    // Analyze task granularity
    const granularityAnalysis = this.analyzeTaskGranularity(output);
    const antiPatterns = this.detectAntiPatterns(output);
    const testabilityScore = this.evaluateTestability(output);

    // Score granularity appropriateness
    score += this.scoreGranularity(granularityAnalysis, info);
    score -= antiPatterns.penalty; // Subtract penalties
    score += testabilityScore;

    info.granularityLevel = granularityAnalysis.level;
    info.taskTypes = granularityAnalysis.types;
    info.antiPatterns = antiPatterns.patterns;

    score = Math.max(0, Math.min(score, 100));
    return { score, info };
  }

  private analyzeTaskGranularity(output: string): {
    level: 'micro' | 'appropriate' | 'macro';
    types: string[];
    avgComplexity: number;
  } {
    const types: string[] = [];
    let complexityPoints = 0;
    let taskCount = 0;

    // Micro-task indicators (too granular)
    const microPatterns = [
      /create.*file|add.*import|update.*variable/i,
      /write.*getter|add.*setter|create.*property/i,
      /add.*comment|update.*documentation/i,
      /install.*package|run.*command/i
    ];

    // Appropriate task indicators
    const appropriatePatterns = [
      /implement.*authentication|build.*login.*flow/i,
      /create.*user.*registration|add.*validation.*logic/i,
      /design.*database.*schema|setup.*api.*endpoint/i,
      /write.*integration.*test|create.*test.*suite/i
    ];

    // Macro-task indicators (too coarse)
    const macroPatterns = [
      /build.*entire.*system|implement.*complete.*application/i,
      /create.*full.*backend|develop.*whole.*frontend/i,
      /setup.*all.*infrastructure|configure.*everything/i
    ];

    // Count and categorize tasks
    [microPatterns, appropriatePatterns, macroPatterns].forEach((patterns, level) => {
      patterns.forEach(pattern => {
        if (pattern.test(output)) {
          taskCount++;
          complexityPoints += level; // 0=micro, 1=appropriate, 2=macro
          types.push(['micro', 'appropriate', 'macro'][level]);
        }
      });
    });

    const avgComplexity = taskCount > 0 ? complexityPoints / taskCount : 1;
    
    let level: 'micro' | 'appropriate' | 'macro';
    if (avgComplexity < 0.5) level = 'micro';
    else if (avgComplexity > 1.5) level = 'macro';
    else level = 'appropriate';

    return { level, types, avgComplexity };
  }

  private detectAntiPatterns(output: string): { patterns: string[]; penalty: number } {
    const patterns: string[] = [];
    let penalty = 0;

    const antiPatterns = [
      { pattern: /TODO|FIXME|placeholder/i, name: 'incomplete-tasks', penalty: 10 },
      { pattern: /later|eventually|somehow|figure.*out/i, name: 'vague-dependencies', penalty: 15 },
      { pattern: /big.*bang|all.*at.*once|everything.*together/i, name: 'big-bang-integration', penalty: 20 },
      { pattern: /waterfall|complete.*before|finish.*first/i, name: 'waterfall-thinking', penalty: 12 },
      { pattern: /just.*code|skip.*test|test.*later/i, name: 'no-tdd', penalty: 25 }
    ];

    antiPatterns.forEach(({ pattern, name, penalty: patternPenalty }) => {
      if (pattern.test(output)) {
        patterns.push(name);
        penalty += patternPenalty;
      }
    });

    return { patterns, penalty };
  }

  private evaluateTestability(output: string): number {
    let score = 0;

    const testabilityIndicators = [
      { pattern: /test.*each.*component|unit.*test.*coverage/i, points: 15 },
      { pattern: /mock|stub|test.*double|dependency.*injection/i, points: 12 },
      { pattern: /integration.*test|end.*to.*end.*test/i, points: 10 },
      { pattern: /test.*boundary|testing.*interface/i, points: 8 },
      { pattern: /red.*green.*refactor|tdd.*cycle/i, points: 20 }
    ];

    testabilityIndicators.forEach(({ pattern, points }) => {
      if (pattern.test(output)) {
        score += points;
      }
    });

    return Math.min(score, 40);
  }

  private scoreGranularity(
    analysis: ReturnType<TaskGranularityMetric['analyzeTaskGranularity']>,
    info: Record<string, any>
  ): number {
    let score = 0;

    switch (analysis.level) {
      case 'appropriate':
        score = 60;
        info.recommendations.push('Excellent task granularity - appropriate for TDD cycles');
        break;
      case 'micro':
        score = 30;
        info.recommendations.push('Tasks too granular - consider grouping related micro-tasks');
        break;
      case 'macro':
        score = 25;
        info.recommendations.push('Tasks too large - break into smaller, testable units');
        break;
    }

    return score;
  }
}

// Feature Scope Boundary Metric
export class FeatureScopeBoundaryMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      scopeClarity: 'unknown',
      boundaryDefinition: [],
      scopeCreep: [],
      recommendations: []
    };

    // Analyze scope definition
    const scopeAnalysis = this.analyzeScopeDefinition(output);
    const boundaryScore = this.evaluateBoundaries(output, info);
    const creepDetection = this.detectScopeCreep(input, output);

    score += scopeAnalysis.score;
    score += boundaryScore;
    score -= creepDetection.penalty;

    info.scopeClarity = scopeAnalysis.clarity;
    info.scopeCreep = creepDetection.indicators;

    score = Math.max(0, Math.min(score, 100));
    return { score, info };
  }

  private analyzeScopeDefinition(output: string): { score: number; clarity: string } {
    let score = 0;
    let clarity = 'poor';

    const clarityIndicators = [
      { pattern: /out.*of.*scope|not.*included|exclude/i, points: 20, level: 'excellent' },
      { pattern: /acceptance.*criteria|definition.*of.*done/i, points: 15, level: 'good' },
      { pattern: /boundary|limit|constraint/i, points: 12, level: 'good' },
      { pattern: /mvp|minimum.*viable|core.*feature/i, points: 10, level: 'fair' },
      { pattern: /future.*iteration|phase.*two|later.*version/i, points: 8, level: 'fair' }
    ];

    clarityIndicators.forEach(({ pattern, points, level }) => {
      if (pattern.test(output)) {
        score += points;
        if (level === 'excellent') clarity = 'excellent';
        else if (level === 'good' && clarity !== 'excellent') clarity = 'good';
        else if (level === 'fair' && clarity === 'poor') clarity = 'fair';
      }
    });

    return { score: Math.min(score, 40), clarity };
  }

  private evaluateBoundaries(output: string, info: Record<string, any>): number {
    let score = 0;

    const boundaryTypes = [
      { pattern: /technical.*boundary|service.*boundary/i, name: 'technical-boundaries' },
      { pattern: /user.*role|permission|access.*control/i, name: 'authorization-boundaries' },
      { pattern: /data.*model|entity.*boundary/i, name: 'data-boundaries' },
      { pattern: /ui.*component|interface.*boundary/i, name: 'interface-boundaries' },
      { pattern: /integration.*point|external.*dependency/i, name: 'integration-boundaries' }
    ];

    boundaryTypes.forEach(({ pattern, name }) => {
      if (pattern.test(output)) {
        score += 8;
        info.boundaryDefinition.push(name);
      }
    });

    return Math.min(score, 30);
  }

  private detectScopeCreep(input: string, output: string): { penalty: number; indicators: string[] } {
    const indicators: string[] = [];
    let penalty = 0;

    // Extract initial scope from input
    const inputLength = input.length;
    const outputLength = output.length;
    
    // Check for scope expansion indicators
    const creepPatterns = [
      { pattern: /also.*need|additionally|furthermore|while.*we.*re.*at.*it/i, name: 'scope-expansion', penalty: 15 },
      { pattern: /perfect.*opportunity|might.*as.*well|since.*we.*re/i, name: 'opportunistic-additions', penalty: 12 },
      { pattern: /comprehensive|complete.*solution|full.*featured/i, name: 'gold-plating', penalty: 10 },
      { pattern: /enterprise|scalable.*to.*millions|production.*ready/i, name: 'premature-optimization', penalty: 8 }
    ];

    creepPatterns.forEach(({ pattern, name, penalty: patternPenalty }) => {
      if (pattern.test(output) && !pattern.test(input)) {
        indicators.push(name);
        penalty += patternPenalty;
      }
    });

    // Penalty for significant output expansion without scope justification
    if (outputLength > inputLength * 3 && indicators.length === 0) {
      indicators.push('unexplained-scope-growth');
      penalty += 5;
    }

    return { penalty, indicators };
  }
}