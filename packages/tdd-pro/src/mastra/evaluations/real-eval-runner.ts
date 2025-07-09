#!/usr/bin/env node

import dotenv from 'dotenv';
import { RefinementAgent } from '../agents/refinement-agent.js';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

// Real evaluation scenarios (not mocked)
const REAL_EVAL_SCENARIOS = [
  {
    name: "Vague Feature Request",
    input: "I want to implement user authentication",
    expectedBehaviors: ["probing questions", "TDD guidance", "specific behaviors"]
  },
  {
    name: "Over-scoped Feature", 
    input: "Build a complete e-commerce platform with user management, payment processing, inventory, analytics dashboard, and admin panel",
    expectedBehaviors: ["recommend breakdown", "multiple features", "scope reduction"]
  },
  {
    name: "Well-defined Feature",
    input: `Feature: User Login
Given a user with valid email and password
When they submit the login form
Then they receive a JWT token and are redirected to dashboard

Test Strategy:
- Unit tests for password validation
- Integration tests for JWT generation`,
    expectedBehaviors: ["recognize completeness", "ready for implementation", "minimal changes"]
  },
  {
    name: "Code Quality Violation",
    input: `
class UserService {
  authenticateUser(email: string, password: string, rememberMe: boolean, ipAddress: string, userAgent: string, deviceFingerprint: string) {
    // This method violates Sandi Metz rules - too many parameters
    return this.validateCredentials(email, password);
  }
}`,
    expectedBehaviors: ["detect violations", "Sandi Metz", "refactoring suggestions"]
  },
  {
    name: "Micro-feature (Over-granular)",
    input: "Add a login button to the header",
    expectedBehaviors: ["too small", "consolidate", "part of larger feature"]
  }
];

class RealEvaluationRunner {
  private agent: RefinementAgent;
  private results: Array<{
    scenario: string;
    input: string;
    output: string;
    timestamp: string;
    evaluationScores: Record<string, number>;
  }> = [];

  constructor(cwd: string) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(`
❌ ANTHROPIC_API_KEY not found in environment variables.

To run real evaluations:
1. Copy .env.example to .env
2. Add your Anthropic API key: ANTHROPIC_API_KEY=your_key_here
3. Run evaluations again

For local development without API costs, use: bun run test:evals
`);
    }

    this.agent = new RefinementAgent({
      storageUrl: ":memory:",
      cwd
    });

    console.log(`🚀 Real Evaluation Runner initialized`);
    console.log(`🔑 Using Anthropic API key: ${process.env.ANTHROPIC_API_KEY?.substring(0, 10)}...`);
    console.log(`🏗️  Working directory: ${cwd}`);
  }

  async runScenario(scenario: typeof REAL_EVAL_SCENARIOS[0]) {
    console.log(`\n📝 Running scenario: ${scenario.name}`);
    console.log(`📤 Input: ${scenario.input.substring(0, 100)}...`);

    try {
      const response = await this.agent.generate(scenario.input, {
        threadId: `eval-${scenario.name.replace(/\s+/g, '-').toLowerCase()}`,
        resourceId: "evaluation-user"
      });
      
      console.log(`📥 Response: ${response.text.substring(0, 200)}...`);

      // Evaluate response against expected behaviors
      const evaluationScores = await this.evaluateResponse(scenario, response.text);

      const result = {
        scenario: scenario.name,
        input: scenario.input,
        output: response.text,
        timestamp: new Date().toISOString(),
        evaluationScores
      };

      this.results.push(result);

      // Log immediate feedback
      console.log(`📊 Scores: ${Object.entries(evaluationScores)
        .map(([metric, score]) => `${metric}=${score}`)
        .join(', ')}`);

      return result;

    } catch (error) {
      console.error(`❌ Scenario failed: ${error}`);
      throw error;
    }
  }

  async evaluateResponse(scenario: typeof REAL_EVAL_SCENARIOS[0], response: string) {
    const scores: Record<string, number> = {};

    // Import our evaluation metrics
    const { TDDCoachingMetric, SandiMetzMetric, ConversationQualityMetric } = 
      await import('./tdd-metrics.js');
    const { FeatureScopeAppropriateness } = 
      await import('./feature-scope-metric.js');

    // Run all relevant metrics
    const tddMetric = new TDDCoachingMetric();
    const tddResult = await tddMetric.measure(scenario.input, response);
    scores.tddCoaching = tddResult.score;

    const conversationMetric = new ConversationQualityMetric();
    const conversationResult = await conversationMetric.measure(scenario.input, response);
    scores.conversationQuality = conversationResult.score;

    const scopeMetric = new FeatureScopeAppropriateness();
    const scopeResult = await scopeMetric.measure(scenario.input, response);
    scores.featureScope = scopeResult.score;

    // For code-related scenarios, also check Sandi Metz
    if (scenario.input.includes('class ') || scenario.input.includes('function ')) {
      const sandiMetric = new SandiMetzMetric();
      const sandiResult = await sandiMetric.measure(scenario.input, response);
      scores.sandiMetz = sandiResult.score;
    }

    // Calculate overall score
    const allScores = Object.values(scores);
    scores.overall = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

    return scores;
  }

  async runAllScenarios() {
    console.log(`🎯 Running real evaluations with live Anthropic API...`);
    
    const startTime = Date.now();
    
    for (const scenario of REAL_EVAL_SCENARIOS) {
      await this.runScenario(scenario);
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const duration = Date.now() - startTime;
    
    // Generate summary
    const summary = this.generateSummary();
    console.log(summary);

    // Save results 
    await this.saveResults();

    return {
      results: this.results,
      summary,
      duration
    };
  }

  generateSummary(): string {
    const scores = this.results.map(r => r.evaluationScores.overall);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passRate = (scores.filter(s => s >= 70).length / scores.length) * 100;

    return `
📊 REAL EVALUATION SUMMARY
========================
🎯 Average Score: ${Math.round(avgScore)}/100
✅ Pass Rate: ${Math.round(passRate)}% (${scores.filter(s => s >= 70).length}/${scores.length})
⏱️  Total Scenarios: ${this.results.length}

🏆 Best Performing:
${this.results
  .sort((a, b) => b.evaluationScores.overall - a.evaluationScores.overall)
  .slice(0, 2)
  .map(r => `   - ${r.scenario}: ${r.evaluationScores.overall}/100`)
  .join('\n')}

⚠️  Needs Improvement:
${this.results
  .filter(r => r.evaluationScores.overall < 70)
  .map(r => `   - ${r.scenario}: ${r.evaluationScores.overall}/100`)
  .join('\n') || '   None - all scenarios passed!'}
`;
  }

  async saveResults() {
    const outputDir = '../../evals/results';
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `real-eval-${timestamp}`;

    // Save detailed results
    const resultsFile = path.join(outputDir, `${filename}.json`);
    await fs.writeFile(resultsFile, JSON.stringify(this.results, null, 2));

    // Save summary report
    const reportFile = path.join(outputDir, `${filename}-report.md`);
    const report = this.generateSummary() + '\n\n## Detailed Results\n\n' +
      this.results.map(r => `
### ${r.scenario}
**Input:** ${r.input.substring(0, 200)}...
**Response:** ${r.output.substring(0, 300)}...
**Scores:** ${Object.entries(r.evaluationScores).map(([k,v]) => `${k}=${v}`).join(', ')}
`).join('\n');

    await fs.writeFile(reportFile, report);

    console.log(`💾 Results saved to: ${outputDir}/`);
    console.log(`   - ${resultsFile}`);
    console.log(`   - ${reportFile}`);
    
    return { resultsFile, reportFile };
  }
}

// CLI execution
async function main() {
  try {
    const cwd = process.cwd();
    const runner = new RealEvaluationRunner(cwd);
    await runner.runAllScenarios();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Real evaluation failed:`, error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}