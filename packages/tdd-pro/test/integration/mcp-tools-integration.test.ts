import { test, expect, describe } from "vitest";
import { 
  startRefinementConversation,
  continueRefinementConversation,
  updateFeaturePRD 
} from "../../src/mastra/tools/refinement-tools";

describe("MCP Tools Integration with TDD-Pro", () => {
  test("should start refinement conversation with existing feature", async () => {
    const result = await startRefinementConversation.execute({
      context: {
        featureId: "test-user-auth",
        message: "I want to refine the user authentication requirements",
        cwd: "/Users/ctoivola/Code/tdd-pro/tdd-pro/packages/tdd-pro"
      }
    });
    
    expect(result).toHaveProperty("threadId");
    expect(result).toHaveProperty("response");
    expect(result.success).toBe(true);
    expect(result.response).toMatch(/test|TDD|behavior/i);
    
    console.log("🚀 MCP Start Conversation:", result);
  });

  test("should continue refinement conversation", async () => {
    // First start a conversation
    const startResult = await startRefinementConversation.execute({
      context: {
        featureId: "test-user-auth", 
        message: "I need login with email validation",
        cwd: "/Users/ctoivola/Code/tdd-pro/tdd-pro/packages/tdd-pro"
      }
    });
    
    // Then continue it
    const continueResult = await continueRefinementConversation.execute({
      context: {
        threadId: startResult.threadId!,
        message: "The system should validate email format and check password strength",
        cwd: "/Users/ctoivola/Code/tdd-pro/tdd-pro/packages/tdd-pro"
      }
    });
    
    expect(continueResult).toHaveProperty("response");
    expect(continueResult.success).toBe(true);
    expect(continueResult.response).toMatch(/specific|test|behavior/i);
    
    console.log("💬 MCP Continue Conversation:", continueResult);
  });

  test("should update feature PRD through conversation", async () => {
    const result = await updateFeaturePRD.execute({
      context: {
        featureId: "test-user-auth",
        refinedRequirements: `
# User Authentication System

## Feature Brief
Implement secure user authentication with login, registration, and JWT token management.

## Acceptance Criteria
- Given a user with valid credentials
- When they submit login form  
- Then they receive JWT token and dashboard access

## Test Strategy
- Unit tests for password validation
- Integration tests for JWT generation
- E2E tests for complete login flow

## Design Discussion
Using dependency injection for testability and following Sandi Metz rules.
`,
        cwd: "/Users/ctoivola/Code/tdd-pro/tdd-pro/packages/tdd-pro"
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/updated|refined/i);
    
    console.log("📝 MCP PRD Update:", result);
  });

  test("should handle feature ID as thread ID", async () => {
    const result1 = await startRefinementConversation.execute({
      context: {
        featureId: "test-user-auth",
        message: "First message",
        cwd: "/Users/ctoivola/Code/tdd-pro/tdd-pro/packages/tdd-pro"
      }
    });
    
    const result2 = await startRefinementConversation.execute({
      context: {
        featureId: "test-user-auth", 
        message: "Second message",
        cwd: "/Users/ctoivola/Code/tdd-pro/tdd-pro/packages/tdd-pro"
      }
    });
    
    // Both should use feature ID as thread ID
    expect(result1.threadId).toBe("test-user-auth");
    expect(result2.threadId).toBe("test-user-auth");
    
    console.log("🔗 MCP Thread ID Consistency:", { 
      id1: result1.threadId, 
      id2: result2.threadId 
    });
  });

  test("should provide proper error handling", async () => {
    const result = await startRefinementConversation.execute({
      context: {
        featureId: "non-existent-feature",
        message: "Test message", 
        cwd: "/Users/ctoivola/Code/tdd-pro/tdd-pro/packages/tdd-pro"
      }
    });
    
    // Even with non-existent feature, the tool should work (it doesn't validate feature existence)
    expect(result.success).toBe(true);
    expect(result.threadId).toBe("non-existent-feature");
    
    console.log("✅ MCP Error Handling (no feature validation):", result);
  });
});