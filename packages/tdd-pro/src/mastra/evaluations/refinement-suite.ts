import { evaluate, EvaluationResult } from "@mastra/core";
import { RefinementAgent } from "../agents/refinement-agent";
import {
  TDDCoachingMetric,
  SandiMetzMetric,
  ConversationQualityMetric,
  RedGreenRefactorMetric,
  FeatureCompletionMetric
} from "./tdd-metrics";

interface EvaluationConfig {
  cwd: string;
  globalRunId: string;
  storageUrl?: string;
}

interface EvaluationScenario {
  testName: string;
  input: string;
  expectedOutput?: string;
  metric: any;
  instructions: string;
}

export async function runRefinementAgentEvaluations(config: EvaluationConfig): Promise<EvaluationResult[]> {
  const agent = new RefinementAgent({
    storageUrl: config.storageUrl || ":memory:",
    cwd: config.cwd
  });

  // Define evaluation scenarios
  const scenarios: EvaluationScenario[] = [
    // TDD Coaching Scenarios
    {
      testName: "TDD coaching - vague feature request",
      input: "I want to implement user authentication",
      metric: new TDDCoachingMetric(),
      instructions: "Evaluate how well the agent coaches TDD practices for vague requests"
    },
    {
      testName: "TDD coaching - implementation question", 
      input: "How should I implement password validation?",
      metric: new RedGreenRefactorMetric(),
      instructions: "Evaluate red-green-refactor cycle guidance"
    },

    // Sandi Metz Rules Scenarios
    {
      testName: "Sandi Metz violation detection",
      input: `
class UserManager {
  authenticateUser(email: string, password: string, rememberMe: boolean, ipAddress: string, userAgent: string) {
    // Method with too many parameters
  }
}`,
      metric: new SandiMetzMetric(),
      instructions: "Evaluate detection of Sandi Metz rule violations"
    },

    // Conversation Quality Scenarios
    {
      testName: "conversation quality - vague behavior",
      input: "The system should handle user input correctly",
      metric: new ConversationQualityMetric(),
      instructions: "Evaluate ability to challenge vague descriptions"
    },

    // Feature Completion Recognition
    {
      testName: "Feature completion recognition",
      input: `
Feature: User Authentication
Given a user with valid credentials
When they log in
Then they receive a JWT token

Test Strategy:
- Unit tests for password validation
- Integration tests for JWT generation
- E2E tests for complete login flow
`,
      metric: new FeatureCompletionMetric(),
      instructions: "Evaluate recognition of well-defined features"
    },

    // Beck TDD Principles
    {
      testName: "Beck TDD principles guidance",
      input: "What's the best way to start implementing this feature?",
      metric: new TDDCoachingMetric(),
      instructions: "Evaluate guidance on Kent Beck TDD principles"
    },

    // Complex Conversation Flow
    {
      testName: "conversation quality - dependency injection",
      input: `
I want to build a payment processor that:
- Validates credit cards
- Charges via Stripe
- Sends email receipts
- Updates user account
`,
      metric: new ConversationQualityMetric(),
      instructions: "Evaluate handling of complex features with multiple dependencies"
    }
  ];

  const results: EvaluationResult[] = [];

  // Run each scenario
  for (const scenario of scenarios) {
    try {
      // Generate agent response
      const response = await agent.generate(scenario.input);
      
      // Evaluate with Mastra's evaluate function
      const evaluation = await evaluate({
        agentName: "TDD Refinement Agent",
        input: scenario.input,
        metric: scenario.metric,
        output: response.text,
        globalRunId: config.globalRunId,
        runId: `${config.globalRunId}-${Date.now()}`,
        testInfo: {
          testName: scenario.testName,
          testPath: "refinement-agent-evaluations"
        },
        instructions: scenario.instructions
      });

      // Ensure testInfo is preserved in the result
      const resultWithTestInfo = {
        ...evaluation,
        testInfo: {
          testName: scenario.testName,
          testPath: "refinement-agent-evaluations"
        }
      };

      results.push(resultWithTestInfo);
    } catch (error) {
      console.error(`Evaluation failed for ${scenario.testName}:`, error);
      // Add a failed result with preserved testInfo
      results.push({
        score: 0,
        output: "Evaluation failed",
        info: { error: String(error) },
        testInfo: {
          testName: scenario.testName,
          testPath: "refinement-agent-evaluations"
        }
      });
    }
  }

  return results;
}

// Helper function to run quick evaluation
export async function runQuickEvaluation(input: string, cwd: string = "/test/project"): Promise<EvaluationResult> {
  const agent = new RefinementAgent({
    storageUrl: ":memory:",
    cwd
  });

  const response = await agent.generate(input);
  
  // Use TDD coaching metric for quick eval
  const metric = new TDDCoachingMetric();
  
  return await evaluate({
    agentName: "TDD Refinement Agent",
    input,
    metric,
    output: response.text,
    globalRunId: `quick-eval-${Date.now()}`,
    instructions: "Quick evaluation of TDD coaching effectiveness"
  });
}