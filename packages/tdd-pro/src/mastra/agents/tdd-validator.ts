export interface Feature {
  id: string;
  name: string;
  description: string;
}

export interface TDDReadinessScore {
  score: number;
  issues: string[];
}

export class TDDValidator {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  async validateSandiMetzRules(code: string, fileName: string): Promise<string[]> {
    const violations: string[] = [];

    // Rule 1: Classes can be no longer than 100 lines
    const lines = code.split('\n');
    if (lines.length > 100) {
      violations.push(`Class exceeds 100 lines (${lines.length} lines) in ${fileName}`);
    }

    // Rule 2: Methods can be no longer than 5 lines
    const methodRegex = /(\w+)\s*\([^)]*\)\s*\{([^}]*)\}/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(code)) !== null) {
      const methodBody = methodMatch[2];
      const methodLines = methodBody.trim().split('\n').filter(line => line.trim() !== '');
      if (methodLines.length > 5) {
        violations.push(`Method ${methodMatch[1]} exceeds 5 lines (${methodLines.length} lines) in ${fileName}`);
      }
    }

    // Rule 3: Methods can take no more than 4 parameters
    const paramRegex = /(\w+)\s*\(([^)]*)\)/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(code)) !== null) {
      const params = paramMatch[2].split(',').filter(p => p.trim() !== '');
      if (params.length > 4) {
        violations.push(`Method ${paramMatch[1]} has too many parameters (${params.length} > 4) in ${fileName}`);
      }
    }

    // Rule 4: Single Responsibility - detect god classes by counting method types
    const methodNames = [];
    const methodNameRegex = /(\w+)\s*\(/g;
    let nameMatch;
    while ((nameMatch = methodNameRegex.exec(code)) !== null) {
      methodNames.push(nameMatch[1]);
    }

    // Simple heuristic: if methods suggest multiple responsibilities
    const responsibilities = new Set();
    methodNames.forEach(name => {
      if (name.includes('save') || name.includes('create') || name.includes('update') || name.includes('delete')) {
        responsibilities.add('data');
      }
      if (name.includes('send') || name.includes('email') || name.includes('notify')) {
        responsibilities.add('communication');
      }
      if (name.includes('validate') || name.includes('check')) {
        responsibilities.add('validation');
      }
      if (name.includes('generate') || name.includes('report') || name.includes('calculate')) {
        responsibilities.add('processing');
      }
    });

    if (responsibilities.size > 2) {
      violations.push(`Class has too many responsibilities (${Array.from(responsibilities).join(', ')}) in ${fileName}`);
    }

    return violations;
  }

  async checkTestStrategy(description: string): Promise<string[]> {
    const feedback: string[] = [];

    // Check if test strategy is mentioned
    const testKeywords = ['test', 'spec', 'jest', 'vitest', 'mocha', 'jasmine', 'cypress'];
    const hasTestMention = testKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );

    if (!hasTestMention) {
      feedback.push("No test strategy mentioned - What testing framework will you use?");
    }

    // Check for vague behaviors
    const vagueIndicators = ['correctly', 'properly', 'well', 'good', 'handle', 'work'];
    const hasVagueBehavior = vagueIndicators.some(indicator => 
      description.toLowerCase().includes(indicator)
    );

    if (hasVagueBehavior) {
      feedback.push("Behavior is too vague - What specific inputs and outputs?");
    }

    // Check for missing specific behaviors
    if (description.length < 50) {
      feedback.push("Description too brief - What specific behaviors should be tested?");
    }

    return feedback;
  }

  async assessTDDReadiness(feature: Feature): Promise<TDDReadinessScore> {
    const issues: string[] = [];
    let score = 100;

    // Check description quality
    if (feature.description.length < 100) {
      issues.push("Feature description too brief");
      score -= 20;
    }

    // Check for test mentions
    const testStrategy = await this.checkTestStrategy(feature.description);
    if (testStrategy.length > 0) {
      issues.push(...testStrategy);
      score -= 15 * testStrategy.length;
    }

    // Check for specific behaviors
    const behaviorKeywords = ['should', 'will', 'must', 'can', 'when', 'given'];
    const hasBehaviors = behaviorKeywords.some(keyword => 
      feature.description.toLowerCase().includes(keyword)
    );

    if (!hasBehaviors) {
      issues.push("No clear behaviors specified");
      score -= 25;
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return { score, issues };
  }
}