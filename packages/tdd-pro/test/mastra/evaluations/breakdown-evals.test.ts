import { test, expect, describe } from "vitest";
import { 
  FeatureBreakdownMetric, 
  TaskGranularityMetric, 
  FeatureScopeBoundaryMetric 
} from "../../../src/mastra/evaluations/breakdown-metrics";

describe("Feature Breakdown Evaluation Metrics", () => {
  describe("FeatureBreakdownMetric", () => {
    test("should score appropriate breakdown for simple feature", async () => {
      const metric = new FeatureBreakdownMetric();
      
      const simpleFeature = "User login with email validation";
      const appropriateBreakdown = `
1. Create login form component
2. Implement email validation logic  
3. Add authentication API endpoint
4. Write integration tests for login flow
`;

      const result = await metric.measure(simpleFeature, appropriateBreakdown);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.info.breakdownAssessment).toBe('appropriate');
      expect(result.info.taskCount).toBe(4);
      
      console.log("✅ Simple Feature Breakdown:", result.score, result.info);
    });

    test("should penalize over-breakdown (too granular)", async () => {
      const metric = new FeatureBreakdownMetric();
      
      const simpleFeature = "User registration form";
      const overBreakdown = `
1. Create HTML form tag
2. Add email input field
3. Add password input field
4. Add submit button
5. Style the form
6. Add form validation
7. Handle form submission
8. Create user model
9. Add database migration
10. Write controller method
11. Add route
12. Write unit test for validation
13. Write integration test
14. Write end-to-end test
15. Update documentation
16. Deploy to staging
`;

      const result = await metric.measure(simpleFeature, overBreakdown);
      
      expect(result.score).toBeLessThan(50);
      expect(result.info.breakdownAssessment).toBe('too-fine');
      expect(result.info.taskCount).toBe(16);
      
      console.log("❌ Over-Breakdown Penalty:", result.score, result.info);
    });

    test("should penalize under-breakdown (too coarse)", async () => {
      const metric = new FeatureBreakdownMetric();
      
      const complexFeature = "Complete e-commerce system with payment processing, inventory management, and user accounts";
      const underBreakdown = `
1. Build the entire system
2. Test everything
`;

      const result = await metric.measure(complexFeature, underBreakdown);
      
      expect(result.score).toBeLessThan(40);
      expect(result.info.breakdownAssessment).toBe('too-coarse');
      expect(result.info.taskCount).toBe(2);
      
      console.log("❌ Under-Breakdown Penalty:", result.score, result.info);
    });

    test("should reward vertical slice thinking", async () => {
      const metric = new FeatureBreakdownMetric();
      
      const feature = "User authentication system";
      const verticalSliceResponse = `
Let's implement this as vertical slices:

1. Minimal viable login - simple email/password with JWT
2. Add password validation and error handling  
3. Implement registration flow end-to-end
4. Add forgotten password functionality

Each slice delivers complete user value and can be tested independently.
`;

      const result = await metric.measure(feature, verticalSliceResponse);
      
      expect(result.score).toBeGreaterThan(80);
      expect(result.info.recommendations).toContain('Excellent: vertical-slice-concept approach');
      
      console.log("🎯 Vertical Slice Bonus:", result.score, result.info);
    });

    test("should detect complex feature and expect more tasks", async () => {
      const metric = new FeatureBreakdownMetric();
      
      const complexFeature = "Real-time chat system with websockets, file sharing, user presence, notifications, and admin dashboard";
      const appropriateComplexBreakdown = `
1. Setup WebSocket infrastructure
2. Implement basic messaging (text only)
3. Add user authentication and rooms
4. Implement user presence indicators
5. Add file upload and sharing
6. Create notification system
7. Build admin dashboard for monitoring
8. Add message persistence and history
9. Implement typing indicators
10. Add emoji and reactions support
`;

      const result = await metric.measure(complexFeature, appropriateComplexBreakdown);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.info.complexityIndicators).toContain('real-time');
      expect(result.info.complexityIndicators).toContain('admin-interface');
      
      console.log("🔥 Complex Feature Handling:", result.score, result.info);
    });
  });

  describe("TaskGranularityMetric", () => {
    test("should score appropriate task granularity", async () => {
      const metric = new TaskGranularityMetric();
      
      const appropriateGranularity = `
- Implement user authentication endpoint with JWT
- Create user registration with email validation
- Build login form component with error handling
- Write integration tests for auth flow
`;

      const result = await metric.measure("", appropriateGranularity);
      
      expect(result.score).toBeGreaterThan(60);
      expect(result.info.granularityLevel).toBe('appropriate');
      
      console.log("✅ Appropriate Granularity:", result.score, result.info);
    });

    test("should penalize micro-tasks", async () => {
      const metric = new TaskGranularityMetric();
      
      const microTasks = `
- Create new file auth.js
- Add import statement for bcrypt
- Write function declaration
- Add parameter validation
- Create variable for salt
- Update package.json
- Run npm install
`;

      const result = await metric.measure("", microTasks);
      
      expect(result.score).toBeLessThan(50);
      expect(result.info.granularityLevel).toBe('micro');
      
      console.log("❌ Micro-task Penalty:", result.score, result.info);
    });

    test("should penalize macro-tasks", async () => {
      const metric = new TaskGranularityMetric();
      
      const macroTasks = `
- Build entire authentication system
- Create complete user management backend
- Implement full frontend with all features
`;

      const result = await metric.measure("", macroTasks);
      
      expect(result.score).toBeLessThan(50);
      expect(result.info.granularityLevel).toBe('macro');
      
      console.log("❌ Macro-task Penalty:", result.score, result.info);
    });

    test("should detect anti-patterns and apply penalties", async () => {
      const metric = new TaskGranularityMetric();
      
      const antiPatternResponse = `
1. Build authentication (TODO: figure out JWT later)
2. Just code the login form without tests
3. Implement everything at once in a big bang approach
4. Skip testing for now, test later
`;

      const result = await metric.measure("", antiPatternResponse);
      
      expect(result.score).toBeLessThan(30);
      expect(result.info.antiPatterns).toContain('incomplete-tasks');
      expect(result.info.antiPatterns).toContain('no-tdd');
      expect(result.info.antiPatterns).toContain('big-bang-integration');
      
      console.log("🚨 Anti-pattern Detection:", result.score, result.info);
    });

    test("should reward testability indicators", async () => {
      const metric = new TaskGranularityMetric();
      
      const testableResponse = `
1. Implement authentication service with dependency injection
2. Create unit tests for each component with mocks
3. Build integration tests for the complete flow
4. Follow red-green-refactor TDD cycles
`;

      const result = await metric.measure("", testableResponse);
      
      expect(result.score).toBeGreaterThan(80);
      
      console.log("🧪 Testability Rewards:", result.score, result.info);
    });
  });

  describe("FeatureScopeBoundaryMetric", () => {
    test("should reward clear scope definition", async () => {
      const metric = new FeatureScopeBoundaryMetric();
      
      const feature = "User authentication system";
      const clearScopeResponse = `
This feature includes:
- User login and registration
- Password validation
- JWT token generation

Out of scope for this iteration:
- Password reset functionality
- Social media login
- Two-factor authentication
- User profile management

The MVP will focus on core authentication only.
`;

      const result = await metric.measure(feature, clearScopeResponse);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.info.scopeClarity).toBe('excellent');
      
      console.log("🎯 Clear Scope Definition:", result.score, result.info);
    });

    test("should detect scope creep", async () => {
      const metric = new FeatureScopeBoundaryMetric();
      
      const simpleFeature = "Basic user login";
      const scopeCreepResponse = `
For the login feature, we need basic authentication. Also, while we're at it, 
we should implement a comprehensive user management system, perfect opportunity 
to add admin dashboards, reporting, email notifications, and make it enterprise-ready 
and scalable to millions of users.
`;

      const result = await metric.measure(simpleFeature, scopeCreepResponse);
      
      expect(result.score).toBeLessThan(50);
      expect(result.info.scopeCreep).toContain('scope-expansion');
      expect(result.info.scopeCreep).toContain('opportunistic-additions');
      expect(result.info.scopeCreep).toContain('premature-optimization');
      
      console.log("🚨 Scope Creep Detection:", result.score, result.info);
    });

    test("should reward boundary definition", async () => {
      const metric = new FeatureScopeBoundaryMetric();
      
      const boundaryResponse = `
Technical boundaries:
- Authentication service handles only JWT validation
- User data model limited to email/password
- UI components scoped to login/register forms

Integration boundaries:
- External dependency: email service for verification
- Database boundary: users table only

Authorization boundaries:
- Regular users vs admin access levels clearly defined
`;

      const result = await metric.measure("", boundaryResponse);
      
      expect(result.score).toBeGreaterThan(60);
      expect(result.info.boundaryDefinition).toContain('technical-boundaries');
      expect(result.info.boundaryDefinition).toContain('authorization-boundaries');
      
      console.log("🏗️ Boundary Definition:", result.score, result.info);
    });

    test("should handle minimal scope appropriately", async () => {
      const metric = new FeatureScopeBoundaryMetric();
      
      const minimalFeature = "Add login button";
      const appropriateMinimalResponse = `
This is a UI-only change:
- Add login button to header
- Wire up click handler to route to login page
- Style consistent with existing buttons

No backend changes needed for this minimal scope.
`;

      const result = await metric.measure(minimalFeature, appropriateMinimalResponse);
      
      expect(result.score).toBeGreaterThan(50);
      
      console.log("✨ Minimal Scope Handling:", result.score, result.info);
    });
  });

  describe("Integration with existing metrics", () => {
    test("should work alongside TDD coaching metrics", async () => {
      const breakdownMetric = new FeatureBreakdownMetric();
      const granularityMetric = new TaskGranularityMetric();
      
      const feature = "User authentication";
      const agentResponse = `
Let's break this down using TDD principles:

1. Write failing test for login endpoint
2. Implement minimal login logic to pass test
3. Refactor and add password validation
4. Write failing test for registration
5. Implement registration endpoint
6. Add integration tests for complete flow

Each task should take 2-4 hours and be independently testable.
Out of scope: password reset, social login.
`;

      const breakdownResult = await breakdownMetric.measure(feature, agentResponse);
      const granularityResult = await granularityMetric.measure(feature, agentResponse);
      
      // Both should score well for TDD-aligned breakdown
      expect(breakdownResult.score).toBeGreaterThan(70);
      expect(granularityResult.score).toBeGreaterThan(70);
      
      console.log("🔄 Combined Metrics:", {
        breakdown: breakdownResult.score,
        granularity: granularityResult.score
      });
    });
  });
});