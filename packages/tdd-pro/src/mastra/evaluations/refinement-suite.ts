import { evaluate, EvaluationResult } from "@mastra/core";
import { RefinementAgent } from "../agents/refinement-agent";
import {
  TDDKnowledgeMetric,
  TestStrategyCoachingMetric,
  ConversationManagementMetric,
  PRDRefinementQualityMetric,
  PersonaConsistencyMetric,
  ConversationTerminationMetric
} from "./prd-refinement-metrics";

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

  // Define evaluation scenarios focused on PRD refinement quality
  const scenarios: EvaluationScenario[] = [
    // TDD Knowledge Application
    {
      testName: "TDD Knowledge - Kent Beck principles",
      input: "I need to implement user authentication with email and password",
      metric: new TDDKnowledgeMetric(),
      instructions: "Evaluate how well the agent applies Kent Beck TDD principles to PRD refinement"
    },
    {
      testName: "TDD Knowledge - Red-Green-Refactor guidance",
      input: "How should I structure the tests for a shopping cart feature?",
      metric: new TDDKnowledgeMetric(),
      instructions: "Evaluate agent's guidance on red-green-refactor cycles for feature development"
    },

    // Test Strategy Coaching
    {
      testName: "Test Strategy - Framework inquiry",
      input: "I want to build a notification system that sends emails and SMS",
      metric: new TestStrategyCoachingMetric(),
      instructions: "Evaluate how well the agent asks about test frameworks and infrastructure"
    },
    {
      testName: "Test Strategy - Test isolation",
      input: "The feature needs to integrate with external payment APIs",
      metric: new TestStrategyCoachingMetric(),
      instructions: "Evaluate agent's coaching on test isolation strategies for external dependencies"
    },

    // PRD Refinement Quality
    {
      testName: "PRD Refinement - Missing architectural details",
      input: "We need a user dashboard that shows analytics data",
      metric: new PRDRefinementQualityMetric(),
      instructions: "Evaluate ability to identify missing architectural details in PRD"
    },
    {
      testName: "PRD Refinement - Implementation specifics",
      input: "Add real-time chat functionality to the application",
      metric: new PRDRefinementQualityMetric(),
      instructions: "Evaluate agent's ability to clarify implementation specifics"
    },

    // Persona Consistency
    {
      testName: "Persona - Senior TDD Architect authority",
      input: "I think we should just start coding and figure it out as we go",
      metric: new PersonaConsistencyMetric(),
      instructions: "Evaluate agent's ability to maintain authoritative TDD expertise"
    },
    {
      testName: "Persona - Challenge vague requirements",
      input: "The system should work well and be fast",
      metric: new PersonaConsistencyMetric(),
      instructions: "Evaluate agent's ability to challenge vague requirements appropriately"
    },

    // Conversation Management
    {
      testName: "Conversation Management - Context maintenance",
      input: "Based on what we discussed earlier about the login flow, how should we handle errors?",
      metric: new ConversationManagementMetric(),
      instructions: "Evaluate agent's ability to maintain context across conversation turns"
    },

    // Conversation Termination
    {
      testName: "Conversation Termination - Well-defined feature",
      input: `
Feature: User Registration
Given a new user provides valid email and password
When they submit the registration form
Then they receive a verification email
And their account is created in pending state

Test Strategy:
- Unit tests for email validation
- Integration tests for user creation
- E2E tests for complete registration flow
- Mock email service for testing
`,
      metric: new ConversationTerminationMetric(),
      instructions: "Evaluate agent's ability to recognize when a feature is properly refined"
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
  
  // Use TDD knowledge metric for quick eval
  const metric = new TDDKnowledgeMetric();
  
  return await evaluate({
    agentName: "TDD Refinement Agent",
    input,
    metric,
    output: response.text,
    globalRunId: `quick-eval-${Date.now()}`,
    instructions: "Quick evaluation of TDD knowledge application in PRD refinement"
  });
}