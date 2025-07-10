import { test, expect, describe } from "vitest";
import { 
  PragmaticDesignCriticismMetric, 
  ExternalConstraintMetric, 
  DesignFlexibilityMetric 
} from "../../../src/mastra/evaluations/pragmatic-design-metrics";

describe("Pragmatic Design Criticism Evaluations", () => {
  describe("PragmaticDesignCriticismMetric", () => {
    test("should score high for identifying violations and asking about constraints", async () => {
      const metric = new PragmaticDesignCriticismMetric();
      
      const badDesign = `
class UserManager {
  authenticateUser(email: string, password: string, rememberMe: boolean, ipAddress: string, userAgent: string, sessionId: string) {
    // Too many parameters
  }
}`;

      const goodResponse = `I see this violates Sandi Metz principles with too many parameters. Is this constrained by an external API or framework? If changeable, let's use a parameter object. If external, let's create a clean wrapper interface.`;
      
      const result = await metric.measure(badDesign, goodResponse);
      
      expect(result.score).toBeGreaterThan(80);
      expect(result.info.designIssuesIdentified).toContain('too-many-parameters');
      expect(result.info.constraintAwareness).toBe('excellent');
      expect(result.info.solutionPaths).toContain('parameter-object');
      
      console.log("✅ Pragmatic Design Criticism:", result.score, result.info);
    });

    test("should penalize missing constraint awareness", async () => {
      const metric = new PragmaticDesignCriticismMetric();
      
      const badDesign = `
class PaymentProcessor {
  processPayment(amount: number, currency: string, cardNumber: string, cvv: string, exp: string, name: string) {
    // Bad design
  }
}`;

      const poorResponse = `This has too many parameters. Use a parameter object instead.`;
      
      const result = await metric.measure(badDesign, poorResponse);
      
      expect(result.score).toBeLessThan(50);
      expect(result.info.constraintAwareness).toBe('none');
      
      console.log("❌ Missing Constraint Awareness:", result.score, result.info);
    });
  });

  describe("ExternalConstraintMetric", () => {
    test("should reward proper handling of external API constraints", async () => {
      const metric = new ExternalConstraintMetric();
      
      const constrainedInput = `We need to integrate with Stripe's API which requires these exact parameters: amount, currency, source, description, metadata.`;
      
      const goodResponse = `Given that this is an external API constraint, we'll create a clean wrapper interface. Let's build a PaymentRequest abstraction that encapsulates these parameters and provides a testable boundary.`;
      
      const result = await metric.measure(constrainedInput, goodResponse);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.info.constraintType).toBe('external-api');
      expect(result.info.handlingStrategy).toBe('wrapper');
      expect(result.info.pragmatism).toBe('excellent');
      
      console.log("🔧 External API Handling:", result.score, result.info);
    });

    test("should handle framework constraints appropriately", async () => {
      const metric = new ExternalConstraintMetric();
      
      const frameworkInput = `React framework requires this component to extend Component class and implement specific lifecycle methods.`;
      
      const pragmaticResponse = `Acknowledge that framework constraints limit our design flexibility. We'll create a thin presentation layer that isolates business logic in testable services outside the React lifecycle.`;
      
      const result = await metric.measure(frameworkInput, pragmaticResponse);
      
      expect(result.score).toBeGreaterThan(60);
      expect(result.info.constraintType).toBe('framework');
      expect(result.info.pragmatism).toBe('excellent');
    });
  });

  describe("DesignFlexibilityMetric", () => {
    test("should reward providing multiple solution paths", async () => {
      const metric = new DesignFlexibilityMetric();
      
      const ambiguousInput = `This service has 15 methods and handles user auth, payment processing, and email notifications.`;
      
      const flexibleResponse = `This is a god object violating SRP. Two approaches: 
      
      If this is changeable code: Split into AuthService, PaymentService, and NotificationService with clear boundaries.
      
      If this is a legacy constraint: Create facade interfaces to test each responsibility separately while gradually extracting services.
      
      Either way, we'll need integration tests for the current interface and unit tests for the extracted logic.`;
      
      const result = await metric.measure(ambiguousInput, flexibleResponse);
      
      expect(result.score).toBeGreaterThan(80);
      expect(result.info.flexibilityLevel).toBe('excellent');
      expect(result.info.alternativesSuggested).toBeGreaterThan(1);
      expect(result.info.testabilityConsiderations.length).toBeGreaterThan(0);
      
      console.log("🔄 Design Flexibility:", result.score, result.info);
    });

    test("should detect rigid thinking", async () => {
      const metric = new DesignFlexibilityMetric();
      
      const rigidResponse = `This violates SRP. Extract three services immediately.`;
      
      const result = await metric.measure("", rigidResponse);
      
      expect(result.score).toBeLessThan(40);
      expect(result.info.flexibilityLevel).toBe('none');
      expect(result.info.alternativesSuggested).toBe(0);
    });
  });

  describe("Integration Scenarios", () => {
    test("should handle mixed internal/external design issues", async () => {
      const designMetric = new PragmaticDesignCriticismMetric();
      const constraintMetric = new ExternalConstraintMetric();
      
      const mixedScenario = `
We're building a payment system that integrates with Stripe (external) but also has our own user management (internal):

class PaymentController {
  chargeCustomer(stripeToken: string, amount: number, currency: string, customerEmail: string, 
                userId: string, subscriptionId: string, discountCode: string) {
    // Mix of internal design choices and external API requirements
  }
}`;

      const nuancedResponse = `I see multiple issues here:

1. Too many parameters (Sandi Metz violation) 
2. Mixed responsibilities (user management + payment)

Is the Stripe integration constraining the token/amount/currency parameters? If so, let's create a StripePaymentRequest wrapper for those.

For the internal user management parameters, we can refactor to inject a UserContext or use a Command pattern.

This gives us: chargeCustomer(paymentRequest: StripePaymentRequest, userContext: UserContext)`;
      
      const designResult = await designMetric.measure(mixedScenario, nuancedResponse);
      const constraintResult = await constraintMetric.measure(mixedScenario, nuancedResponse);
      
      expect(designResult.score).toBeGreaterThan(70);
      expect(constraintResult.score).toBeGreaterThan(60);
      
      console.log("🎯 Mixed Scenario Handling:", {
        design: designResult.score,
        constraint: constraintResult.score
      });
    });
  });
});