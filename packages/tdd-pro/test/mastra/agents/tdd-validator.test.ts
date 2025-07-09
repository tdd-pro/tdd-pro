import { test, expect, describe } from "vitest";

describe("TDD Validator Engine", () => {
  test("FAILING: should validate Sandi Metz rules - class length", async () => {
    // RED: This should fail because TDDValidator doesn't exist yet
    const { TDDValidator } = await import("../../../src/mastra/agents/tdd-validator");
    
    const validator = new TDDValidator("/test/project");
    
    // Test class with too many lines (Sandi Metz rule: max 100 lines)
    const longClass = `
class UserManager {
  ${Array(110).fill(0).map((_, i) => `  // Line ${i + 1}`).join('\n')}
}`;
    
    const violations = await validator.validateSandiMetzRules(longClass, "UserManager.ts");
    
    expect(violations).toContainEqual(
      expect.stringContaining("Class exceeds 100 lines")
    );
  });

  test("FAILING: should validate Sandi Metz rules - method parameters", async () => {
    // RED: This should fail because parameter validation doesn't exist yet
    const { TDDValidator } = await import("../../../src/mastra/agents/tdd-validator");
    
    const validator = new TDDValidator("/test/project");
    
    // Test method with too many parameters (Sandi Metz rule: max 4 parameters)
    const methodWithManyParams = `
class AuthService {
  authenticate(email: string, password: string, rememberMe: boolean, ipAddress: string, userAgent: string) {
    // Too many parameters
  }
}`;
    
    const violations = await validator.validateSandiMetzRules(methodWithManyParams, "AuthService.ts");
    
    expect(violations).toContainEqual(
      expect.stringContaining("Method authenticate has too many parameters (5 > 4)")
    );
  });

  test("FAILING: should validate Sandi Metz rules - method length", async () => {
    // RED: This should fail because method length validation doesn't exist yet
    const { TDDValidator } = await import("../../../src/mastra/agents/tdd-validator");
    
    const validator = new TDDValidator("/test/project");
    
    // Test method with too many lines (Sandi Metz rule: max 5 lines)
    const longMethod = `
class Calculator {
  calculate() {
    const step1 = 1;
    const step2 = 2;
    const step3 = 3;
    const step4 = 4;
    const step5 = 5;
    const step6 = 6; // Line 6 - exceeds limit
    return step6;
  }
}`;
    
    const violations = await validator.validateSandiMetzRules(longMethod, "Calculator.ts");
    
    expect(violations).toContainEqual(
      expect.stringContaining("Method calculate exceeds 5 lines")
    );
  });

  test("FAILING: should assess test strategy in feature descriptions", async () => {
    // RED: This should fail because test strategy assessment doesn't exist yet
    const { TDDValidator } = await import("../../../src/mastra/agents/tdd-validator");
    
    const validator = new TDDValidator("/test/project");
    
    const featureWithoutTests = "Build a user authentication system with login and logout";
    const feedback = await validator.checkTestStrategy(featureWithoutTests);
    
    expect(feedback).toContainEqual(
      expect.stringContaining("No test strategy mentioned")
    );
    expect(feedback).toContainEqual(
      expect.stringContaining("What testing framework will you use?")
    );
  });

  test("FAILING: should assess TDD readiness of feature", async () => {
    // RED: This should fail because TDD readiness scoring doesn't exist yet
    const { TDDValidator } = await import("../../../src/mastra/agents/tdd-validator");
    
    const validator = new TDDValidator("/test/project");
    
    const feature = {
      id: "user-auth",
      name: "User Authentication",
      description: "Users can log in with email and password"
    };
    
    const readinessScore = await validator.assessTDDReadiness(feature);
    
    expect(readinessScore).toHaveProperty("score");
    expect(readinessScore).toHaveProperty("issues");
    expect(readinessScore.score).toBeGreaterThanOrEqual(0);
    expect(readinessScore.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(readinessScore.issues)).toBe(true);
  });

  test("FAILING: should identify missing test behaviors", async () => {
    // RED: This should fail because behavior analysis doesn't exist yet
    const { TDDValidator } = await import("../../../src/mastra/agents/tdd-validator");
    
    const validator = new TDDValidator("/test/project");
    
    const vagueBehavior = "The system should handle user input correctly";
    const feedback = await validator.checkTestStrategy(vagueBehavior);
    
    expect(feedback).toContainEqual(
      expect.stringContaining("Behavior is too vague")
    );
    expect(feedback).toContainEqual(
      expect.stringContaining("What specific inputs and outputs?")
    );
  });

  test("FAILING: should validate single responsibility principle", async () => {
    // RED: This should fail because SRP validation doesn't exist yet
    const { TDDValidator } = await import("../../../src/mastra/agents/tdd-validator");
    
    const validator = new TDDValidator("/test/project");
    
    const godClass = `
class UserManager {
  saveUser() { /* database logic */ }
  sendEmail() { /* email logic */ }
  validateInput() { /* validation logic */ }
  generateReport() { /* reporting logic */ }
}`;
    
    const violations = await validator.validateSandiMetzRules(godClass, "UserManager.ts");
    
    expect(violations).toContainEqual(
      expect.stringContaining("Class has too many responsibilities")
    );
  });
});