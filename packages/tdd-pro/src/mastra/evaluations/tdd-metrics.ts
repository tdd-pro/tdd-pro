import { Metric, MetricResult } from "@mastra/core";

// TDD Coaching Effectiveness Metric
export class TDDCoachingMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      tddKeywords: [],
      probingQuestions: [],
      coachingElements: []
    };

    // Check for TDD-specific keywords and concepts
    const tddKeywords = [
      'test', 'failing test', 'red', 'green', 'refactor', 
      'behavior', 'expected', 'assert', 'TDD', 'test-driven'
    ];
    
    tddKeywords.forEach(keyword => {
      if (output.toLowerCase().includes(keyword.toLowerCase())) {
        score += 10;
        info.tddKeywords.push(keyword);
      }
    });

    // Check for probing questions (TDD coaching style)
    const probingPatterns = [
      /what.*test/i,
      /what.*behavior/i,
      /how.*test/i,
      /what.*expect/i,
      /failing.*test/i,
      /specific.*behavior/i
    ];

    probingPatterns.forEach(pattern => {
      if (pattern.test(output)) {
        score += 15;
        info.probingQuestions.push(pattern.source);
      }
    });

    // Check for TDD cycle guidance
    if (output.includes('red') && output.includes('green') && output.includes('refactor')) {
      score += 25;
      info.coachingElements.push('full-tdd-cycle');
    }

    // Cap at 100
    score = Math.min(score, 100);

    return { score, info };
  }
}

// Sandi Metz Rules Violation Detection Metric
export class SandiMetzMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      detectedViolations: [],
      mentionedRules: []
    };

    // Check if input contains code violations
    const hasParameterViolation = /\w+\s*\([^)]*,[^)]*,[^)]*,[^)]*,[^)]*\)/.test(input);
    const hasLongClass = input.split('\n').length > 100;
    const hasLongMethod = /\{[^}]{200,}\}/.test(input);

    // Check if agent detected parameter violations
    if (hasParameterViolation && 
        (output.includes('parameters') || output.includes('too many'))) {
      score += 41;
      info.detectedViolations.push('method-parameters');
    }

    // Check for Sandi Metz rule mentions
    if (output.toLowerCase().includes('sandi metz')) {
      score += 30;
      info.mentionedRules.push('sandi-metz');
    }

    // Check for specific rule guidance
    const ruleKeywords = [
      'single responsibility',
      '100 lines',
      '5 lines',
      '4 parameters',
      'dependency injection'
    ];

    ruleKeywords.forEach(rule => {
      if (output.toLowerCase().includes(rule)) {
        score += 10;
        info.mentionedRules.push(rule);
      }
    });

    // Bonus for suggesting refactoring
    if (output.includes('refactor') || output.includes('extract')) {
      score += 15;
    }

    score = Math.min(score, 100);
    return { score, info };
  }
}

// Conversation Quality Assessment Metric
export class ConversationQualityMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      probingQuestions: 0,
      specificityLevel: 'low',
      coachingTone: false
    };

    // Count probing questions
    const questionCount = (output.match(/\?/g) || []).length;
    info.probingQuestions = questionCount;
    score += Math.min(questionCount * 25, 50);

    // Check for specificity demands
    const specificityKeywords = ['specific', 'exactly', 'precisely', 'what exactly'];
    specificityKeywords.forEach(keyword => {
      if (output.toLowerCase().includes(keyword)) {
        score += 15;
        info.specificityLevel = 'high';
      }
    });

    // Check for coaching tone
    const coachingPhrases = [
      'let\'s think about',
      'consider',
      'what if',
      'how might',
      'tell me more'
    ];

    coachingPhrases.forEach(phrase => {
      if (output.toLowerCase().includes(phrase)) {
        score += 15;
        info.coachingTone = true;
      }
    });

    // Penalize vague responses
    if (input.includes('properly') || input.includes('correctly')) {
      if (output.includes('vague') || output.includes('specific')) {
        score += 20; // Good - challenged vagueness
      } else {
        score -= 10; // Bad - didn't challenge vague input
      }
    }

    score = Math.max(0, Math.min(score, 100));
    return { score, info };
  }
}

// Red-Green-Refactor Cycle Guidance Metric
export class RedGreenRefactorMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      mentionedCycles: [],
      tddSteps: []
    };

    // Check for explicit TDD cycle mentions
    if (output.toLowerCase().includes('red-green-refactor')) {
      score += 40;
      info.mentionedCycles.push('red-green-refactor');
    }

    // Check for individual cycle components
    const cycles = ['red', 'green', 'refactor'];
    cycles.forEach(cycle => {
      if (output.toLowerCase().includes(cycle)) {
        score += 15;
        info.mentionedCycles.push(cycle);
      }
    });

    // Check for TDD step guidance
    const tddSteps = [
      'failing test',
      'write test first',
      'make it pass',
      'clean up',
      'minimal implementation'
    ];

    tddSteps.forEach(step => {
      if (output.toLowerCase().includes(step)) {
        score += 10;
        info.tddSteps.push(step);
      }
    });

    score = Math.min(score, 100);
    return { score, info };
  }
}

// Feature Completion Recognition Metric
export class FeatureCompletionMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      recognizedCompletion: false,
      completionIndicators: []
    };

    // Check if input is well-defined (Given-When-Then)
    const hasGivenWhenThen = 
      input.includes('Given') && 
      input.includes('When') && 
      input.includes('Then');

    const hasTestStrategy = input.toLowerCase().includes('test strategy');

    if (hasGivenWhenThen || hasTestStrategy) {
      // Input seems complete, check if agent recognized it
      const completionKeywords = [
        'well-defined',
        'ready',
        'complete',
        'implementation',
        'good to go',
        'comprehensive'
      ];

      completionKeywords.forEach(keyword => {
        if (output.toLowerCase().includes(keyword)) {
          score += 25;
          info.completionIndicators.push(keyword);
          info.recognizedCompletion = true;
        }
      });

      // Bonus for suggesting next steps
      if (output.includes('implement') || output.includes('code')) {
        score += 20;
      }
    } else {
      // Input is incomplete, agent should ask for more
      if (output.includes('?') || output.includes('need')) {
        score += 25; // Good - asking for more details
      }
    }

    score = Math.min(score, 100);
    return { score, info };
  }
}