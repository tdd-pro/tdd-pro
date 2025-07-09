#!/usr/bin/env node

import dotenv from 'dotenv';
import { RefinementAgent } from '../agents/refinement-agent.js';
import { DesignQualityMetric, ArchitecturalPatternMetric, DesignAlternativeMetric } from './design-quality-metrics.js';
import { DESIGN_EVALUATION_SCENARIOS } from './design-evaluation-scenarios.js';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

class DesignEvaluationRunner {
  private agent: RefinementAgent;
  private results: Array<{
    scenario: string;
    input: string;
    output: string;
    designIssues: string[];
    expectedBehaviors: string[];
    evaluationScores: {
      designQuality: number;
      architecturalPatterns: number;
      designAlternatives: number;
      overall: number;
    };
    evaluationDetails: Record<string, any>;
    timestamp: string;
  }> = [];

  constructor(cwd: string) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(`
❌ ANTHROPIC_API_KEY not found in environment variables.

To run design evaluations:
1. Copy .env.example to .env
2. Add your Anthropic API key: ANTHROPIC_API_KEY=your_key_here
3. Run design evaluations again
`);
    }

    this.agent = new RefinementAgent({
      storageUrl: ":memory:",
      cwd
    });

    console.log(`🎨 Design Evaluation Runner initialized`);
    console.log(`🔑 Using Anthropic API key: ${process.env.ANTHROPIC_API_KEY?.substring(0, 10)}...`);
    console.log(`🏗️  Working directory: ${cwd}`);
  }

  async runDesignScenario(scenario: typeof DESIGN_EVALUATION_SCENARIOS[0]) {
    console.log(`\n🎯 Running design scenario: ${scenario.name}`);
    console.log(`📋 Description: ${scenario.description}`);
    console.log(`📤 Input: ${scenario.input.substring(0, 150)}...`);

    try {
      // Generate agent response
      const response = await this.agent.generate(scenario.input, {
        threadId: `design-eval-${scenario.name.replace(/\s+/g, '-').toLowerCase()}`,
        resourceId: "design-evaluator"
      });
      
      console.log(`📥 Response: ${response.text.substring(0, 200)}...`);

      // Evaluate response with design quality metrics
      const evaluationScores = await this.evaluateDesignResponse(scenario, response.text);
      const evaluationDetails = await this.getDetailedEvaluations(scenario, response.text);

      const result = {
        scenario: scenario.name,
        input: scenario.input,
        output: response.text,
        designIssues: scenario.designIssues,
        expectedBehaviors: scenario.expectedBehaviors,
        evaluationScores,
        evaluationDetails,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);

      // Log immediate feedback
      console.log(`📊 Scores: designQuality=${evaluationScores.designQuality}, patterns=${evaluationScores.architecturalPatterns}, alternatives=${evaluationScores.designAlternatives}, overall=${evaluationScores.overall}`);

      return result;

    } catch (error) {
      console.error(`❌ Design scenario failed: ${error}`);
      throw error;
    }
  }

  async evaluateDesignResponse(scenario: typeof DESIGN_EVALUATION_SCENARIOS[0], response: string) {
    const scores = {
      designQuality: 0,
      architecturalPatterns: 0,
      designAlternatives: 0,
      overall: 0
    };

    try {
      // Design Quality Evaluation
      const designQualityMetric = new DesignQualityMetric();
      const designResult = await designQualityMetric.measure(scenario.input, response);
      scores.designQuality = designResult.score;

      // Architectural Pattern Recognition
      const patternMetric = new ArchitecturalPatternMetric();
      const patternResult = await patternMetric.measure(scenario.input, response);
      scores.architecturalPatterns = patternResult.score;

      // Design Alternative Suggestions
      const alternativeMetric = new DesignAlternativeMetric();
      const alternativeResult = await alternativeMetric.measure(scenario.input, response);
      scores.designAlternatives = alternativeResult.score;

      // Calculate overall score
      scores.overall = Math.round(
        (scores.designQuality + scores.architecturalPatterns + scores.designAlternatives) / 3
      );

    } catch (error) {
      console.error(`❌ Design evaluation failed: ${error}`);
    }

    return scores;
  }

  async getDetailedEvaluations(scenario: typeof DESIGN_EVALUATION_SCENARIOS[0], response: string) {
    const details: Record<string, any> = {};

    try {
      const designQualityMetric = new DesignQualityMetric();
      const designResult = await designQualityMetric.measure(scenario.input, response);
      details.designQuality = designResult.info;

      const patternMetric = new ArchitecturalPatternMetric();
      const patternResult = await patternMetric.measure(scenario.input, response);
      details.architecturalPatterns = patternResult.info;

      const alternativeMetric = new DesignAlternativeMetric();
      const alternativeResult = await alternativeMetric.measure(scenario.input, response);
      details.designAlternatives = alternativeResult.info;

    } catch (error) {
      console.error(`❌ Detailed evaluation failed: ${error}`);
    }

    return details;
  }

  async runAllDesignScenarios() {
    console.log(`🎨 Running design evaluation scenarios with live Anthropic API...`);
    
    const startTime = Date.now();
    
    for (const scenario of DESIGN_EVALUATION_SCENARIOS) {
      await this.runDesignScenario(scenario);
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
    const overallScores = this.results.map(r => r.evaluationScores.overall);
    const designQualityScores = this.results.map(r => r.evaluationScores.designQuality);
    const patternScores = this.results.map(r => r.evaluationScores.architecturalPatterns);
    const alternativeScores = this.results.map(r => r.evaluationScores.designAlternatives);

    const avgOverall = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
    const avgDesignQuality = designQualityScores.reduce((a, b) => a + b, 0) / designQualityScores.length;
    const avgPatterns = patternScores.reduce((a, b) => a + b, 0) / patternScores.length;
    const avgAlternatives = alternativeScores.reduce((a, b) => a + b, 0) / alternativeScores.length;

    const passRate = (overallScores.filter(s => s >= 70).length / overallScores.length) * 100;

    return `
🎨 DESIGN EVALUATION SUMMARY
===========================
🎯 Overall Average: ${Math.round(avgOverall)}/100
🔍 Design Quality: ${Math.round(avgDesignQuality)}/100
🏗️  Architectural Patterns: ${Math.round(avgPatterns)}/100
🔄 Design Alternatives: ${Math.round(avgAlternatives)}/100
✅ Pass Rate: ${Math.round(passRate)}% (${overallScores.filter(s => s >= 70).length}/${overallScores.length})
⏱️  Total Scenarios: ${this.results.length}

🏆 Best Performing Scenarios:
${this.results
  .sort((a, b) => b.evaluationScores.overall - a.evaluationScores.overall)
  .slice(0, 3)
  .map(r => `   - ${r.scenario}: ${r.evaluationScores.overall}/100`)
  .join('\n')}

⚠️  Needs Improvement:
${this.results
  .filter(r => r.evaluationScores.overall < 70)
  .sort((a, b) => a.evaluationScores.overall - b.evaluationScores.overall)
  .map(r => `   - ${r.scenario}: ${r.evaluationScores.overall}/100`)
  .join('\n') || '   None - all scenarios passed!'}

🔍 Design Issue Detection Analysis:
${this.results.map(r => {
  const issuesFound = r.evaluationDetails.designQuality?.designIssuesIdentified || '';
  const expectedIssues = r.designIssues.length;
  return `   - ${r.scenario}: ${issuesFound ? 'Issues identified' : 'No issues identified'} (expected ${expectedIssues} issues)`;
}).join('\n')}
`;
  }

  async saveResults() {
    const outputDir = '../../evals/results';
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `design-eval-${timestamp}`;

    // Save detailed results
    const resultsFile = path.join(outputDir, `${filename}.json`);
    await fs.writeFile(resultsFile, JSON.stringify(this.results, null, 2));

    // Save summary report
    const reportFile = path.join(outputDir, `${filename}-report.md`);
    const report = this.generateSummary() + '\n\n## Detailed Results\n\n' +
      this.results.map(r => `
### ${r.scenario}

**Expected Issues**: ${r.designIssues.join(', ')}
**Expected Behaviors**: ${r.expectedBehaviors.join(', ')}

**Input**: ${r.input.substring(0, 300)}...

**Agent Response**: ${r.output.substring(0, 500)}...

**Evaluation Scores**:
- Design Quality: ${r.evaluationScores.designQuality}/100
- Architectural Patterns: ${r.evaluationScores.architecturalPatterns}/100
- Design Alternatives: ${r.evaluationScores.designAlternatives}/100
- Overall: ${r.evaluationScores.overall}/100

**Design Issues Identified**: ${r.evaluationDetails.designQuality?.designIssuesIdentified || 'None'}

**Architectural Suggestions**: ${r.evaluationDetails.architecturalPatterns?.patternsSuggested || 'None'}

**Alternative Designs**: ${r.evaluationDetails.designAlternatives?.alternativesProvided || 'None'}

---
`).join('\n');

    await fs.writeFile(reportFile, report);

    console.log(`💾 Design evaluation results saved to: ${outputDir}/`);
    console.log(`   - ${resultsFile}`);
    console.log(`   - ${reportFile}`);
    
    return { resultsFile, reportFile };
  }
}

// CLI execution
async function main() {
  try {
    const cwd = process.cwd();
    const runner = new DesignEvaluationRunner(cwd);
    await runner.runAllDesignScenarios();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Design evaluation failed:`, error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}