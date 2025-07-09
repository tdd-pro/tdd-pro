import { test, expect, describe } from "vitest";
import { runQuickEvaluation } from "../../src/mastra/evaluations/refinement-suite";

describe("Refinement Agent Integration Workflow", () => {
  test("should provide comprehensive TDD coaching for authentication feature", async () => {
    const input = "I want to implement user authentication with login and registration";
    
    const result = await runQuickEvaluation(input);
    
    // Validate agent provides TDD coaching
    expect(result.score).toBeGreaterThan(70);
    expect(result.output).toMatch(/test|TDD|behavior|fail/i);
    
    console.log("🚀 Agent TDD Coaching Response:", result.output);
    console.log("📊 Coaching Effectiveness Score:", result.score);
  });

  test("should challenge vague feature requirements", async () => {
    const input = "Make the authentication work properly and securely";
    
    const result = await runQuickEvaluation(input);
    
    // Should ask probing questions
    expect(result.output).toMatch(/\?/);
    expect(result.output).toMatch(/specific|behavior|test|what/i);
    
    console.log("🎯 Agent Probing Response:", result.output);
  });

  test("should recognize well-defined features", async () => {
    const wellDefinedInput = `
Feature: User Authentication
Given a user with valid email and password
When they submit the login form
Then they receive a JWT token and are redirected to dashboard

Test Strategy:
- Unit tests for password validation
- Integration tests for JWT generation  
- E2E tests for complete login flow
`;
    
    const result = await runQuickEvaluation(wellDefinedInput);
    
    // Should recognize completeness
    expect(result.output).toMatch(/well-defined|ready|complete|implementation/i);
    
    console.log("✅ Agent Completion Recognition:", result.output);
  });

  test("should detect code quality violations", async () => {
    const codeInput = `
class AuthManager {
  authenticateUser(email: string, password: string, rememberMe: boolean, ipAddress: string, userAgent: string, deviceId: string) {
    // This method has too many parameters (violates Sandi Metz rules)
    return this.validateCredentials(email, password) && this.trackLogin(ipAddress, userAgent, deviceId);
  }
}`;
    
    const result = await runQuickEvaluation(codeInput);
    
    // Should detect parameter violations
    expect(result.output).toMatch(/parameter|too many|Sandi Metz|refactor/i);
    
    console.log("🔍 Agent Code Review:", result.output);
  });

  test("should maintain conversation context and flow", async () => {
    // Test sequential conversation
    const firstInput = "I need user authentication";
    const firstResult = await runQuickEvaluation(firstInput);
    
    expect(firstResult.score).toBeGreaterThan(60);
    expect(firstResult.output).toMatch(/test|behavior|specific/i);
    
    const followUpInput = "I want login with email validation and JWT tokens";
    const followUpResult = await runQuickEvaluation(followUpInput);
    
    expect(followUpResult.score).toBeGreaterThan(70);
    
    console.log("💬 Conversation Flow Test:");
    console.log("First:", firstResult.output.substring(0, 100) + "...");
    console.log("Follow-up:", followUpResult.output.substring(0, 100) + "...");
  });
});