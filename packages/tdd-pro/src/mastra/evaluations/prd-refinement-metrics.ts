import { Metric, MetricResult } from "@mastra/core";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

// Helper function for test environment scoring
function getMockScore(output: string, criteria: Record<string, number>): MetricResult {
  let score = 50; // Base score
  const lowerOutput = output.toLowerCase();
  
  for (const [keyword, points] of Object.entries(criteria)) {
    if (lowerOutput.includes(keyword)) {
      score += points;
    }
  }
  
  return {
    score: Math.min(score, 100),
    info: {
      reasoning: "Mock evaluation in test environment",
      mode: "test-heuristic"
    }
  };
}

// TDD Knowledge Application Metric
export class TDDKnowledgeMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    const evaluationPrompt = `
You are evaluating a TDD Refinement Agent's response for TDD knowledge application.

CONTEXT:
- This agent should embody wisdom of Kent Beck, Sandi Metz, and Gary Bernhardt
- The agent should guide developers through red-green-refactor cycles
- The agent should apply TDD principles to PRD refinement

INPUT (Developer's request): "${input}"
OUTPUT (Agent's response): "${output}"

EVALUATION CRITERIA:
1. Does the agent demonstrate Kent Beck TDD principles?
2. Does the agent mention or guide through red-green-refactor cycles?
3. Does the agent apply TDD thinking to requirement refinement?
4. Does the agent reference TDD masters (Beck, Metz, Bernhardt) appropriately?
5. Does the agent focus on test-first design thinking?

Rate the response 0-100 based on TDD knowledge application quality.
Provide specific examples of what the agent did well or poorly.

Response format:
SCORE: [0-100]
REASONING: [Detailed explanation with specific examples]
STRENGTHS: [What the agent did well]
IMPROVEMENTS: [What could be better]
`;

    try {
      const model = anthropic(process.env.EVAL_MODEL || "claude-3-5-sonnet-20241022");
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1, // Low temperature for consistent evaluation
      });

      const response = result.text;
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const reasoningMatch = response.match(/REASONING:\s*([^]+?)(?=\n\s*(?:STRENGTHS|IMPROVEMENTS|$))/i);
      const strengthsMatch = response.match(/STRENGTHS:\s*([^]+?)(?=\n\s*(?:IMPROVEMENTS|$))/i);
      const improvementsMatch = response.match(/IMPROVEMENTS:\s*([^]+?)(?=\n\s*$)/i);

      return {
        score,
        info: {
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
          strengths: strengthsMatch ? strengthsMatch[1].trim() : "",
          improvements: improvementsMatch ? improvementsMatch[1].trim() : "",
          evaluationType: "TDD Knowledge Application"
        }
      };
    } catch (error) {
      return {
        score: 0,
        info: {
          error: `Evaluation failed: ${error.message}`,
          evaluationType: "TDD Knowledge Application"
        }
      };
    }
  }
}

// Test Strategy Coaching Metric
export class TestStrategyCoachingMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    const evaluationPrompt = `
You are evaluating a TDD Refinement Agent's response for test strategy coaching quality.

CONTEXT:
- The agent should ask about test frameworks and infrastructure
- The agent should validate test isolation strategies
- The agent should coach developers on test structure
- The agent should ensure test-first thinking

INPUT (Developer's request): "${input}"
OUTPUT (Agent's response): "${output}"

EVALUATION CRITERIA:
1. Does the agent ask about existing test frameworks?
2. Does the agent inquire about test infrastructure setup?
3. Does the agent validate test isolation strategies?
4. Does the agent coach on test structure and patterns?
5. Does the agent ensure test-first design thinking?
6. Does the agent ask for failing tests that drive the feature?

Rate the response 0-100 based on test strategy coaching quality.

Response format:
SCORE: [0-100]
REASONING: [Detailed explanation with specific examples]
STRENGTHS: [What the agent did well]
IMPROVEMENTS: [What could be better]
`;

    try {
      const model = anthropic(process.env.EVAL_MODEL || "claude-3-5-sonnet-20241022");
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1,
      });

      const response = result.text;
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const reasoningMatch = response.match(/REASONING:\s*([^]+?)(?=\n\s*(?:STRENGTHS|IMPROVEMENTS|$))/i);
      const strengthsMatch = response.match(/STRENGTHS:\s*([^]+?)(?=\n\s*(?:IMPROVEMENTS|$))/i);
      const improvementsMatch = response.match(/IMPROVEMENTS:\s*([^]+?)(?=\n\s*$)/i);

      return {
        score,
        info: {
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
          strengths: strengthsMatch ? strengthsMatch[1].trim() : "",
          improvements: improvementsMatch ? improvementsMatch[1].trim() : "",
          evaluationType: "Test Strategy Coaching"
        }
      };
    } catch (error) {
      return {
        score: 0,
        info: {
          error: `Evaluation failed: ${error.message}`,
          evaluationType: "Test Strategy Coaching"
        }
      };
    }
  }
}

// Conversation Management Metric
export class ConversationManagementMetric extends Metric {
  async measure(input: string, output: string, conversationHistory?: string[]): Promise<MetricResult> {
    const historyContext = conversationHistory ? 
      `\nCONVERSATION HISTORY:\n${conversationHistory.join('\n---\n')}` : 
      '\nCONVERSATION HISTORY: None (first exchange)';

    const evaluationPrompt = `
You are evaluating a TDD Refinement Agent's conversation management skills.

CONTEXT:
- The agent should maintain context across conversation turns
- The agent should build on previous responses appropriately
- The agent should reference earlier exchanges when relevant
- The agent should manage conversation flow toward PRD completion

INPUT (Developer's latest message): "${input}"
OUTPUT (Agent's response): "${output}"
${historyContext}

EVALUATION CRITERIA:
1. Does the agent maintain context from previous exchanges?
2. Does the agent build on previous responses appropriately?
3. Does the agent reference earlier conversation when relevant?
4. Does the agent manage conversation flow effectively?
5. Does the agent avoid repetition and redundancy?
6. Does the agent progress toward PRD completion?

Rate the response 0-100 based on conversation management quality.

Response format:
SCORE: [0-100]
REASONING: [Detailed explanation with specific examples]
STRENGTHS: [What the agent did well]
IMPROVEMENTS: [What could be better]
`;

    try {
      const model = anthropic(process.env.EVAL_MODEL || "claude-3-5-sonnet-20241022");
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1,
      });

      const response = result.text;
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const reasoningMatch = response.match(/REASONING:\s*([^]+?)(?=\n\s*(?:STRENGTHS|IMPROVEMENTS|$))/i);
      const strengthsMatch = response.match(/STRENGTHS:\s*([^]+?)(?=\n\s*(?:IMPROVEMENTS|$))/i);
      const improvementsMatch = response.match(/IMPROVEMENTS:\s*([^]+?)(?=\n\s*$)/i);

      return {
        score,
        info: {
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
          strengths: strengthsMatch ? strengthsMatch[1].trim() : "",
          improvements: improvementsMatch ? improvementsMatch[1].trim() : "",
          evaluationType: "Conversation Management"
        }
      };
    } catch (error) {
      return {
        score: 0,
        info: {
          error: `Evaluation failed: ${error.message}`,
          evaluationType: "Conversation Management"
        }
      };
    }
  }
}

// PRD Refinement Quality Metric
export class PRDRefinementQualityMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    const evaluationPrompt = `
You are evaluating a TDD Refinement Agent's PRD refinement quality.

CONTEXT:
- The agent should refine PRD requirements to be technically complete
- The agent should ensure requirements are TDD-ready
- The agent should identify missing architectural details
- The agent should clarify implementation specifics

INPUT (Developer's request): "${input}"
OUTPUT (Agent's response): "${output}"

EVALUATION CRITERIA:
1. Does the agent identify missing architectural details?
2. Does the agent clarify new vs existing components?
3. Does the agent ask for implementation specifics?
4. Does the agent ensure PRD technical completeness?
5. Does the agent focus on requirement clarity over code quality?
6. Does the agent produce actionable refinement guidance?

Rate the response 0-100 based on PRD refinement quality.

Response format:
SCORE: [0-100]
REASONING: [Detailed explanation with specific examples]
STRENGTHS: [What the agent did well]
IMPROVEMENTS: [What could be better]
`;

    try {
      const model = anthropic(process.env.EVAL_MODEL || "claude-3-5-sonnet-20241022");
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1,
      });

      const response = result.text;
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const reasoningMatch = response.match(/REASONING:\s*([^]+?)(?=\n\s*(?:STRENGTHS|IMPROVEMENTS|$))/i);
      const strengthsMatch = response.match(/STRENGTHS:\s*([^]+?)(?=\n\s*(?:IMPROVEMENTS|$))/i);
      const improvementsMatch = response.match(/IMPROVEMENTS:\s*([^]+?)(?=\n\s*$)/i);

      return {
        score,
        info: {
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
          strengths: strengthsMatch ? strengthsMatch[1].trim() : "",
          improvements: improvementsMatch ? improvementsMatch[1].trim() : "",
          evaluationType: "PRD Refinement Quality"
        }
      };
    } catch (error) {
      return {
        score: 0,
        info: {
          error: `Evaluation failed: ${error.message}`,
          evaluationType: "PRD Refinement Quality"
        }
      };
    }
  }
}

// Senior TDD Architect Persona Metric
export class PersonaConsistencyMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    const evaluationPrompt = `
You are evaluating a TDD Refinement Agent's persona consistency as a "Senior TDD Architect".

CONTEXT:
- The agent should maintain authoritative TDD expertise
- The agent should challenge developers appropriately
- The agent should embody senior architect confidence
- The agent should demonstrate deep technical knowledge

INPUT (Developer's request): "${input}"
OUTPUT (Agent's response): "${output}"

EVALUATION CRITERIA:
1. Does the agent maintain authoritative TDD expertise?
2. Does the agent challenge vague requirements appropriately?
3. Does the agent demonstrate senior architect confidence?
4. Does the agent show deep technical knowledge?
5. Does the agent balance authority with helpfulness?
6. Does the agent maintain consistent "Senior TDD Architect" persona?

Rate the response 0-100 based on persona consistency.

Response format:
SCORE: [0-100]
REASONING: [Detailed explanation with specific examples]
STRENGTHS: [What the agent did well]
IMPROVEMENTS: [What could be better]
`;

    try {
      const model = anthropic(process.env.EVAL_MODEL || "claude-3-5-sonnet-20241022");
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1,
      });

      const response = result.text;
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const reasoningMatch = response.match(/REASONING:\s*([^]+?)(?=\n\s*(?:STRENGTHS|IMPROVEMENTS|$))/i);
      const strengthsMatch = response.match(/STRENGTHS:\s*([^]+?)(?=\n\s*(?:IMPROVEMENTS|$))/i);
      const improvementsMatch = response.match(/IMPROVEMENTS:\s*([^]+?)(?=\n\s*$)/i);

      return {
        score,
        info: {
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
          strengths: strengthsMatch ? strengthsMatch[1].trim() : "",
          improvements: improvementsMatch ? improvementsMatch[1].trim() : "",
          evaluationType: "Persona Consistency"
        }
      };
    } catch (error) {
      return {
        score: 0,
        info: {
          error: `Evaluation failed: ${error.message}`,
          evaluationType: "Persona Consistency"
        }
      };
    }
  }
}

// Conversation Termination Appropriateness Metric
export class ConversationTerminationMetric extends Metric {
  async measure(input: string, output: string): Promise<MetricResult> {
    const evaluationPrompt = `
You are evaluating a TDD Refinement Agent's conversation termination appropriateness.

CONTEXT:
- The agent should recognize when features are properly refined
- The agent should terminate conversations at appropriate times
- The agent should provide clear "ready for implementation" signals
- The agent should not continue conversations unnecessarily

INPUT (Developer's request): "${input}"
OUTPUT (Agent's response): "${output}"

EVALUATION CRITERIA:
1. Does the agent recognize when a feature is properly refined?
2. Does the agent terminate conversations appropriately?
3. Does the agent provide clear completion signals?
4. Does the agent avoid unnecessary continuation?
5. Does the agent summarize what was accomplished?
6. Does the agent indicate readiness for implementation?

Rate the response 0-100 based on conversation termination appropriateness.

Response format:
SCORE: [0-100]
REASONING: [Detailed explanation with specific examples]
STRENGTHS: [What the agent did well]
IMPROVEMENTS: [What could be better]
`;

    try {
      const model = anthropic(process.env.EVAL_MODEL || "claude-3-5-sonnet-20241022");
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1,
      });

      const response = result.text;
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const reasoningMatch = response.match(/REASONING:\s*([^]+?)(?=\n\s*(?:STRENGTHS|IMPROVEMENTS|$))/i);
      const strengthsMatch = response.match(/STRENGTHS:\s*([^]+?)(?=\n\s*(?:IMPROVEMENTS|$))/i);
      const improvementsMatch = response.match(/IMPROVEMENTS:\s*([^]+?)(?=\n\s*$)/i);

      return {
        score,
        info: {
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
          strengths: strengthsMatch ? strengthsMatch[1].trim() : "",
          improvements: improvementsMatch ? improvementsMatch[1].trim() : "",
          evaluationType: "Conversation Termination"
        }
      };
    } catch (error) {
      return {
        score: 0,
        info: {
          error: `Evaluation failed: ${error.message}`,
          evaluationType: "Conversation Termination"
        }
      };
    }
  }
}