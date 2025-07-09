// Design Evaluation Test Scenarios
// These scenarios test the refinement agent's ability to identify design issues

export const DESIGN_EVALUATION_SCENARIOS = [
  {
    name: "God Class Anti-Pattern",
    description: "Tests if agent identifies and challenges overly complex classes",
    input: `
I want to implement a UserManager class that:
- Validates user input (email, password, phone)
- Handles user authentication and authorization
- Manages user sessions and tokens
- Sends email notifications
- Logs user activities
- Handles payment processing for user subscriptions
- Manages user preferences and settings
- Generates user reports and analytics
- Handles file uploads for profile pictures
- Manages user relationships (friends, followers)
`,
    expectedBehaviors: [
      "Should identify Single Responsibility Principle violation",
      "Should suggest breaking into smaller classes",
      "Should mention separation of concerns",
      "Should question the testability of such a large class",
      "Should reference Sandi Metz principles about class size"
    ],
    designIssues: [
      "Multiple responsibilities in one class",
      "Poor separation of concerns",
      "Difficult to test",
      "High coupling"
    ]
  },

  {
    name: "Tightly Coupled Dependencies",
    description: "Tests if agent identifies tight coupling issues",
    input: `
I need to implement a OrderProcessor that:
- Creates new Order objects directly inside the process() method
- Calls EmailService.sendConfirmation() directly
- Instantiates PaymentGateway inside the method
- Directly accesses the database with SQL queries
- Hardcodes the shipping calculation logic

Here's the rough structure:
class OrderProcessor {
  process(orderData) {
    const order = new Order(orderData);
    const payment = new StripePaymentGateway();
    const result = payment.charge(order.total);
    
    // Direct database access
    const db = new Database();
    db.query("INSERT INTO orders...");
    
    // Hardcoded email
    EmailService.sendConfirmation(order.email, "Order confirmed");
    
    // Hardcoded shipping
    const shipping = order.weight * 2.5 + 5.00;
  }
}
`,
    expectedBehaviors: [
      "Should identify tight coupling issues",
      "Should suggest dependency injection",
      "Should question direct instantiation of dependencies",
      "Should recommend interfaces/abstractions",
      "Should mention testing difficulties due to tight coupling"
    ],
    designIssues: [
      "Direct dependency instantiation",
      "Tight coupling to concrete classes",
      "Hardcoded business logic",
      "No dependency injection",
      "Difficult to mock for testing"
    ]
  },

  {
    name: "Primitive Obsession",
    description: "Tests if agent identifies over-reliance on primitive types",
    input: `
I want to build a user authentication system with these methods:
- validateUser(email: string, password: string, loginAttempts: number, lastLogin: string, userType: string)
- createUser(firstName: string, lastName: string, email: string, phone: string, address: string, city: string, state: string, zip: string, country: string)
- updatePermissions(userId: string, canRead: boolean, canWrite: boolean, canDelete: boolean, canAdmin: boolean, canModerator: boolean)

All the business logic will work directly with these string and boolean parameters.
`,
    expectedBehaviors: [
      "Should suggest value objects for complex data",
      "Should identify primitive obsession",
      "Should recommend domain modeling",
      "Should question method parameter counts",
      "Should suggest grouping related parameters"
    ],
    designIssues: [
      "Primitive obsession",
      "Too many method parameters",
      "Lack of domain modeling",
      "No value objects",
      "Poor data encapsulation"
    ]
  },

  {
    name: "Anemic Domain Model",
    description: "Tests if agent identifies lack of behavior in domain objects",
    input: `
I want to create a shopping cart system with these data structures:
- Cart: { items: [], total: 0, discount: 0, userId: string }
- Item: { id: string, name: string, price: number, quantity: number }
- User: { id: string, email: string, membershipLevel: string }

And these service classes that do all the work:
- CartService: addItem(), removeItem(), calculateTotal(), applyDiscount()
- ItemService: validateItem(), updateQuantity(), checkStock()
- UserService: getMembershipDiscount(), validateUser()

The data objects just hold data, and all the business logic is in services.
`,
    expectedBehaviors: [
      "Should identify anemic domain model",
      "Should suggest moving behavior into domain objects",
      "Should question separation of data and behavior",
      "Should recommend rich domain models",
      "Should mention object-oriented design principles"
    ],
    designIssues: [
      "Anemic domain model",
      "Separation of data and behavior",
      "Over-reliance on services",
      "Missing domain logic encapsulation",
      "Poor object-oriented design"
    ]
  },

  {
    name: "Mixed Abstraction Levels",
    description: "Tests if agent identifies inconsistent abstraction levels",
    input: `
I want to implement a ReportGenerator that:
- Takes high-level business requirements
- Directly manipulates SQL query strings
- Handles low-level file I/O operations
- Manages HTTP response formatting
- Performs business calculations

Like this:
class ReportGenerator {
  generateSalesReport(startDate, endDate) {
    // High-level business logic
    const salesData = this.calculateSalesMetrics(startDate, endDate);
    
    // Low-level SQL manipulation
    const query = "SELECT * FROM sales WHERE date BETWEEN '" + startDate + "' AND '" + endDate + "'";
    const results = database.execute(query);
    
    // File system operations
    const fs = require('fs');
    fs.writeFileSync('/tmp/report.csv', results);
    
    // HTTP response formatting
    response.setHeader('Content-Type', 'application/csv');
    response.send(fileContent);
  }
}
`,
    expectedBehaviors: [
      "Should identify mixed abstraction levels",
      "Should suggest layered architecture",
      "Should question mixing high and low-level operations",
      "Should recommend separation of concerns",
      "Should mention single level of abstraction principle"
    ],
    designIssues: [
      "Mixed abstraction levels",
      "Single method doing too much",
      "Layering violations",
      "Poor separation of concerns",
      "Hard to test and maintain"
    ]
  },

  {
    name: "Feature Envy",
    description: "Tests if agent identifies when classes are overly interested in other classes",
    input: `
I want to create an InvoiceCalculator that:
- Takes a Customer object and accesses customer.address.country, customer.membershipLevel, customer.paymentHistory
- Takes an Order object and accesses order.items.price, order.items.taxCategory, order.shipping.method
- Uses Product methods: product.getDiscountRate(), product.getTaxRate(), product.getShippingWeight()
- Calls external services: TaxService.calculateTax(), ShippingService.calculateShipping()

The InvoiceCalculator will do most of its work by calling methods on other objects and accessing their properties.
`,
    expectedBehaviors: [
      "Should identify feature envy",
      "Should suggest moving behavior to appropriate classes",
      "Should question excessive method calls on other objects",
      "Should recommend Tell Don't Ask principle",
      "Should mention proper responsibility assignment"
    ],
    designIssues: [
      "Feature envy",
      "Violation of Tell Don't Ask",
      "Inappropriate intimacy between classes",
      "Misplaced responsibility",
      "High coupling"
    ]
  },

  {
    name: "Good Design (Control Test)",
    description: "Tests if agent recognizes well-designed code and doesn't over-criticize",
    input: `
I want to implement a PaymentProcessor with this design:

interface PaymentGateway {
  charge(amount: Money): PaymentResult;
}

class PaymentProcessor {
  constructor(private gateway: PaymentGateway, private logger: Logger) {}
  
  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    // Single responsibility: orchestrate payment processing
    // Dependencies injected for testability
    // Uses value objects (Money, PaymentRequest)
    // Clear abstraction with interface
  }
}

class Money {
  constructor(private amount: number, private currency: string) {}
  add(other: Money): Money { /* implementation */ }
  // Rich domain object with behavior
}

Each class has a single responsibility, dependencies are injected, and domain concepts are modeled as objects.
`,
    expectedBehaviors: [
      "Should recognize good design patterns",
      "Should acknowledge dependency injection",
      "Should appreciate value objects",
      "Should note single responsibility adherence",
      "Should not over-criticize well-designed code"
    ],
    designIssues: [] // This is a good design - should have minimal issues
  }
];

// Expected agent response quality indicators
export const DESIGN_EVALUATION_CRITERIA = {
  DESIGN_SMELL_DETECTION: [
    "Identifies specific design anti-patterns",
    "Names the design issues correctly",
    "Explains why the design is problematic",
    "References established design principles"
  ],
  ALTERNATIVE_SUGGESTIONS: [
    "Proposes concrete alternative designs",
    "Explains benefits of suggested changes",
    "Provides specific refactoring steps",
    "Considers testability implications"
  ],
  ARCHITECTURAL_GUIDANCE: [
    "Applies SOLID principles appropriately",
    "Suggests appropriate design patterns",
    "Considers separation of concerns",
    "Balances complexity vs simplicity"
  ],
  TDD_INTEGRATION: [
    "Connects design quality to testability",
    "Explains how design affects test structure",
    "Suggests test-friendly alternatives",
    "Maintains TDD focus while evaluating design"
  ]
};

// Helper function to create evaluation prompts
export function createDesignEvaluationPrompt(scenario: typeof DESIGN_EVALUATION_SCENARIOS[0], agentResponse: string): string {
  return `
You are evaluating a TDD Refinement Agent's ability to identify and address design quality issues.

SCENARIO: ${scenario.name}
DESCRIPTION: ${scenario.description}

INPUT (Developer's request): "${scenario.input}"
AGENT RESPONSE: "${agentResponse}"

KNOWN DESIGN ISSUES IN INPUT:
${scenario.designIssues.map(issue => `- ${issue}`).join('\n')}

EXPECTED BEHAVIORS:
${scenario.expectedBehaviors.map(behavior => `- ${behavior}`).join('\n')}

EVALUATION CRITERIA:
1. Does the agent identify the design issues present in the input?
2. Does the agent suggest appropriate alternatives or improvements?
3. Does the agent explain why the current design is problematic?
4. Does the agent maintain focus on TDD while addressing design concerns?
5. Does the agent provide actionable guidance for improvement?

Rate the response 0-100 based on design evaluation quality.
Provide specific examples of what the agent did well or missed.

Response format:
SCORE: [0-100]
DESIGN_ISSUES_IDENTIFIED: [List of issues the agent correctly identified]
MISSED_ISSUES: [List of issues the agent should have caught but didn't]
SUGGESTIONS_QUALITY: [Assessment of the agent's alternative suggestions]
REASONING: [Detailed explanation with specific examples]
`;
}