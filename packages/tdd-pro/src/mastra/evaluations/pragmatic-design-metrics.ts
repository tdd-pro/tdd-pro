import { Metric, MetricResult } from "@mastra/core";

// Pragmatic Design Criticism Metric
export class PragmaticDesignCriticismMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      designIssuesIdentified: [],
      constraintAwareness: 'none',
      solutionPaths: [],
      recommendations: []
    };

    // Check if input contains design issues
    const designIssues = this.identifyDesignIssues(input, info);
    
    // Evaluate agent's response to design issues
    if (designIssues.length > 0) {
      score += this.evaluateDesignIssueHandling(output, designIssues, info);
      score += this.evaluateConstraintAwareness(output, info);
      score += this.evaluateSolutionPaths(output, info);
    } else {
      // If no obvious design issues, base score
      score = 50;
    }

    score = Math.min(score, 100);
    return { score, info };
  }

  private identifyDesignIssues(input: string, info: Record<string, any>): string[] {
    const issues: string[] = [];

    const designPatterns = [
      { pattern: /\(\s*[^)]*:\s*\w+\s*,\s*[^)]*:\s*\w+\s*,\s*[^)]*:\s*\w+\s*,\s*[^)]*:\s*\w+\s*,\s*[^)]*:\s*\w+/, name: 'too-many-parameters' },
      { pattern: /class.*{[\s\S]*public.*public.*public.*public/m, name: 'god-object' },
      { pattern: /new\s+[A-Z]\w*\(/g, name: 'tight-coupling' },
      { pattern: /static\s+[A-Za-z]/g, name: 'static-dependencies' },
      { pattern: /\.getInstance\(\)/g, name: 'singleton-abuse' },
      { pattern: /if.*instanceof/g, name: 'type-checking' }
    ];

    designPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(input)) {
        issues.push(name);
      }
    });

    info.designIssuesIdentified = issues;
    return issues;
  }

  private evaluateDesignIssueHandling(output: string, issues: string[], info: Record<string, any>): number {
    let score = 0;

    // Check if agent identifies the specific issues - more flexible patterns
    issues.forEach(issue => {
      const identificationPatterns = {
        'too-many-parameters': /too many.*parameters|parameters.*too many|parameter.*count|violates.*sandi.*metz|many.*parameters/i,
        'god-object': /god.*object|too many.*responsibilities|single.*responsibility|srp/i,
        'tight-coupling': /tight.*coupling|coupling.*too.*tight|dependencies.*hard.*coded/i,
        'static-dependencies': /static.*dependencies|global.*state|singleton/i,
        'singleton-abuse': /singleton.*abuse|global.*state|shared.*state/i,
        'type-checking': /type.*checking|instanceof.*antipattern|polymorphism/i
      };

      const pattern = identificationPatterns[issue as keyof typeof identificationPatterns];
      if (pattern && pattern.test(output)) {
        score += 25; // More generous scoring for identifying issues
      }
    });

    return score;
  }

  private evaluateConstraintAwareness(output: string, info: Record<string, any>): number {
    let score = 0;

    // Check if agent asks about constraints - make patterns more flexible
    const constraintQuestions = [
      /is.*this.*external/i,
      /constrained.*by/i,
      /can.*this.*be.*changed/i,
      /changeable.*code/i,
      /external.*api/i,
      /framework.*requirement/i,
      /if.*changeable/i,
      /if.*external/i
    ];

    let asksAboutConstraints = false;
    constraintQuestions.forEach(pattern => {
      if (pattern.test(output)) {
        asksAboutConstraints = true;
      }
    });

    if (asksAboutConstraints) {
      score += 35; // More generous scoring
      info.constraintAwareness = 'excellent';
    } else if (output.includes('constraint') || output.includes('external')) {
      score += 15;
      info.constraintAwareness = 'partial';
    } else {
      info.constraintAwareness = 'none';
    }

    return score;
  }

  private evaluateSolutionPaths(output: string, info: Record<string, any>): number {
    let score = 0;
    const solutions: string[] = [];

    // Check for conditional recommendations
    const conditionalPatterns = [
      { pattern: /if.*changeable.*let.*s/i, name: 'conditional-ideal' },
      { pattern: /if.*external.*wrapper/i, name: 'external-wrapper' },
      { pattern: /if.*framework.*abstraction/i, name: 'framework-abstraction' },
      { pattern: /if.*not.*inject/i, name: 'dependency-injection' },
      { pattern: /parameter.*object/i, name: 'parameter-object' },
      { pattern: /clean.*interface/i, name: 'clean-interface' }
    ];

    conditionalPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(output)) {
        solutions.push(name);
        score += 10;
      }
    });

    // Bonus for providing both paths
    if (solutions.length >= 2) {
      score += 15;
    }

    info.solutionPaths = solutions;
    return score;
  }
}

// External Constraint Handling Metric
export class ExternalConstraintMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      constraintType: 'none',
      handlingStrategy: 'none',
      pragmatism: 'none'
    };

    // Detect constraint types from input
    const constraintType = this.detectConstraintType(input);
    info.constraintType = constraintType;

    if (constraintType !== 'none') {
      score += this.evaluateConstraintHandling(output, constraintType, info);
      score += this.evaluatePragmatism(output, info);
    } else {
      score = 60; // Neutral score if no constraints detected
    }

    score = Math.min(score, 100);
    return { score, info };
  }

  private detectConstraintType(input: string): string {
    const constraints = [
      { pattern: /external.*api/i, type: 'external-api' },
      { pattern: /third.*party.*library/i, type: 'library' },
      { pattern: /framework.*requires/i, type: 'framework' },
      { pattern: /legacy.*system/i, type: 'legacy' },
      { pattern: /database.*schema.*cannot/i, type: 'database' },
      { pattern: /compliance.*requirement/i, type: 'compliance' }
    ];

    for (const { pattern, type } of constraints) {
      if (pattern.test(input)) {
        return type;
      }
    }

    return 'none';
  }

  private evaluateConstraintHandling(output: string, constraintType: string, info: Record<string, any>): number {
    let score = 0;

    const handlingStrategies = {
      'external-api': ['wrapper', 'adapter', 'facade'],
      'library': ['abstraction', 'interface', 'encapsulation'],
      'framework': ['layer', 'boundary', 'isolation'],
      'legacy': ['anti-corruption', 'wrapper', 'bridge'],
      'database': ['repository', 'mapping', 'abstraction'],
      'compliance': ['validation', 'encapsulation', 'boundary']
    };

    const strategies = handlingStrategies[constraintType as keyof typeof handlingStrategies] || [];
    
    strategies.forEach(strategy => {
      if (output.toLowerCase().includes(strategy)) {
        score += 15;
        info.handlingStrategy = strategy;
      }
    });

    return score;
  }

  private evaluatePragmatism(output: string, info: Record<string, any>): number {
    let score = 0;

    // Look for pragmatic language - more flexible patterns
    const pragmaticPatterns = [
      /given.*constraint/i,
      /if.*cannot.*be.*changed/i,
      /work.*within.*limitation/i,
      /best.*we.*can.*do/i,
      /acknowledge.*constraint/i,
      /accept.*that/i,
      /abstraction.*layer/i,
      /wrapper/i,
      /encapsulation/i
    ];

    const hasPragmaticLanguage = pragmaticPatterns.some(pattern => pattern.test(output));
    
    if (hasPragmaticLanguage) {
      score += 40; // More generous
      info.pragmatism = 'excellent';
    } else if (output.includes('constraint') || output.includes('limitation')) {
      score += 20;
      info.pragmatism = 'good';
    } else {
      info.pragmatism = 'none';
    }

    return score;
  }
}

// Design Flexibility Assessment Metric
export class DesignFlexibilityMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    let score = 0;
    const info: Record<string, any> = {
      flexibilityLevel: 'none',
      alternativesSuggested: 0,
      testabilityConsiderations: []
    };

    score += this.evaluateFlexibilityThinking(output, info);
    score += this.evaluateAlternatives(output, info);
    score += this.evaluateTestabilityFocus(output, info);

    score = Math.min(score, 100);
    return { score, info };
  }

  private evaluateFlexibilityThinking(output: string, info: Record<string, any>): number {
    let score = 0;

    const flexibilityIndicators = [
      /depending.*on.*whether/i,
      /if.*this.*is.*changeable/i,
      /two.*approaches/i,
      /alternative.*would.*be/i,
      /either.*way/i,
      /both.*scenarios/i,
      /if.*changeable/i,
      /if.*this/i,
      /otherwise/i
    ];

    const flexibilityCount = flexibilityIndicators.filter(pattern => pattern.test(output)).length;
    
    if (flexibilityCount >= 3) {
      score += 50; // More generous
      info.flexibilityLevel = 'excellent';
    } else if (flexibilityCount >= 2) {
      score += 35;
      info.flexibilityLevel = 'good';
    } else if (flexibilityCount >= 1) {
      score += 20;
      info.flexibilityLevel = 'basic';
    } else {
      info.flexibilityLevel = 'none';
    }

    return score;
  }

  private evaluateAlternatives(output: string, info: Record<string, any>): number {
    let score = 0;

    // Count explicit alternatives mentioned
    const alternativePatterns = [
      /option.*1.*option.*2/i,
      /approach.*a.*approach.*b/i,
      /first.*second/i,
      /alternatively/gi,
      /another.*way/gi,
      /or.*we.*could/gi
    ];

    let alternativeCount = 0;
    alternativePatterns.forEach(pattern => {
      const matches = output.match(pattern);
      if (matches) alternativeCount += matches.length;
    });

    score += Math.min(alternativeCount * 10, 30);
    info.alternativesSuggested = alternativeCount;

    return score;
  }

  private evaluateTestabilityFocus(output: string, info: Record<string, any>): number {
    let score = 0;
    const considerations: string[] = [];

    const testabilityPatterns = [
      { pattern: /test.*both.*scenarios/i, name: 'scenario-testing' },
      { pattern: /mock.*external/i, name: 'external-mocking' },
      { pattern: /integration.*test/i, name: 'integration-testing' },
      { pattern: /test.*adapter/i, name: 'adapter-testing' },
      { pattern: /verify.*wrapper/i, name: 'wrapper-testing' }
    ];

    testabilityPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(output)) {
        considerations.push(name);
        score += 10;
      }
    });

    info.testabilityConsiderations = considerations;
    return score;
  }
}