import { createWorkflow, WorkflowStep, WorkflowContext } from "@mastra/core";
import { z } from "zod";
import { RefinementAgent } from "../agents/refinement-agent";

// Workflow State Schema
const RefinementWorkflowState = z.object({
  featureId: z.string(),
  userId: z.string(),
  phase: z.enum(['entry', 'conversation', 'evaluation', 'exit', 'abandoned']),
  criteriaChecked: z.array(z.string()),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'agent']),
    message: z.string(),
    timestamp: z.string(),
  })),
  exitReason: z.enum(['tdd-ready', 'abandoned', 'timeout']).optional(),
  refinementScore: z.number().optional(),
});

type RefinementWorkflowState = z.infer<typeof RefinementWorkflowState>;

// Workflow Entry Requirements
export const REFINEMENT_CRITERIA = {
  TDD_READINESS: [
    "Feature has clear, testable behaviors",
    "Test strategy is defined and appropriate",
    "Dependencies are identified and mockable",
    "Feature follows SOLID principles",
    "Implementation boundaries are clear",
    "Red-Green-Refactor cycle is applicable",
  ],
  CONVERSATION_RULES: [
    "Agent acts as Senior TDD Architect",
    "Agent challenges vague requirements",
    "Agent provides Beck/Metz/Bernhardt wisdom",
    "Agent ensures test-first thinking",
    "Agent can terminate conversation when criteria met",
  ],
  EXIT_CONDITIONS: [
    "Feature requirements are technically complete",
    "Test strategy is validated and appropriate",
    "Design boundaries follow TDD best practices",
    "All vague behaviors have been clarified",
    "Implementation path is clear and testable",
  ]
};

// Entry Step: Declare Requirements
const entryStep: WorkflowStep = {
  id: 'entry',
  name: 'Declare Refinement Requirements',
  description: 'Agent declares refinement criteria and workflow expectations',
  execute: async (context: WorkflowContext) => {
    const state = context.state as RefinementWorkflowState;
    
    const entryMessage = `
## TDD Refinement Session Started

Hello! I'm your Senior TDD Architect. I'll help refine this feature to meet TDD standards.

### Refinement Criteria
I will evaluate this feature against:
${REFINEMENT_CRITERIA.TDD_READINESS.map(criterion => `- ${criterion}`).join('\n')}

### Conversation Rules
${REFINEMENT_CRITERIA.CONVERSATION_RULES.map(rule => `- ${rule}`).join('\n')}

### Exit Conditions
This session will complete when:
${REFINEMENT_CRITERIA.EXIT_CONDITIONS.map(condition => `- ${condition}`).join('\n')}

### Workflow Options
- **Continue**: Engage in refinement conversation
- **Abandon**: Exit workflow if feature isn't suitable for TDD
- **Skip**: Proceed without refinement (not recommended)

Let's begin! Tell me about the feature you want to refine.
`;

    // Update state
    state.phase = 'conversation';
    state.conversationHistory.push({
      role: 'agent',
      message: entryMessage,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: entryMessage,
      state,
    };
  },
};

// Conversation Step: Interactive Refinement
const conversationStep: WorkflowStep = {
  id: 'conversation',
  name: 'Conduct Refinement Conversation',
  description: 'Agent engages in back-and-forth dialogue to refine requirements',
  execute: async (context: WorkflowContext) => {
    const state = context.state as RefinementWorkflowState;
    const { input } = context;

    // Get agent instance
    const agent = new RefinementAgent({
      storageUrl: ":memory:",
      cwd: process.cwd(),
    });

    // Generate response using agent
    const response = await agent.generate(input.message, {
      threadId: state.featureId,
      resourceId: state.userId,
    });

    // Add to conversation history
    state.conversationHistory.push(
      {
        role: 'user',
        message: input.message,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'agent',
        message: response.text,
        timestamp: new Date().toISOString(),
      }
    );

    // Check if agent indicated completion
    const isComplete = response.text.toLowerCase().includes('tdd-ready') ||
                      response.text.toLowerCase().includes('refinement complete') ||
                      response.text.toLowerCase().includes('ready for implementation');

    if (isComplete) {
      state.phase = 'evaluation';
    }

    return {
      success: true,
      message: response.text,
      state,
      nextStep: isComplete ? 'evaluation' : 'conversation',
    };
  },
};

// Evaluation Step: Assess TDD Readiness
const evaluationStep: WorkflowStep = {
  id: 'evaluation',
  name: 'Evaluate TDD Readiness',
  description: 'Agent evaluates feature against TDD criteria',
  execute: async (context: WorkflowContext) => {
    const state = context.state as RefinementWorkflowState;

    // Import our evaluation metrics
    const { PRDRefinementQualityMetric, TDDKnowledgeMetric } = 
      await import('../evaluations/prd-refinement-metrics');

    // Get the last user message and agent response
    const lastUserMessage = state.conversationHistory
      .filter(h => h.role === 'user')
      .slice(-1)[0]?.message || '';
    
    const lastAgentResponse = state.conversationHistory
      .filter(h => h.role === 'agent')
      .slice(-1)[0]?.message || '';

    // Evaluate refinement quality
    const prdMetric = new PRDRefinementQualityMetric();
    const prdResult = await prdMetric.measure(lastUserMessage, lastAgentResponse);

    const tddMetric = new TDDKnowledgeMetric();
    const tddResult = await tddMetric.measure(lastUserMessage, lastAgentResponse);

    // Calculate overall score
    const overallScore = (prdResult.score + tddResult.score) / 2;
    state.refinementScore = overallScore;

    // Determine exit condition
    if (overallScore >= 70) {
      state.phase = 'exit';
      state.exitReason = 'tdd-ready';
    } else {
      state.phase = 'conversation'; // Continue refining
    }

    const evaluationMessage = `
## TDD Readiness Evaluation

**Overall Score**: ${overallScore}/100

**PRD Refinement Quality**: ${prdResult.score}/100
${prdResult.info.reasoning}

**TDD Knowledge Application**: ${tddResult.score}/100
${tddResult.info.reasoning}

**Status**: ${overallScore >= 70 ? 'TDD-Ready ✅' : 'Needs Further Refinement ⚠️'}

${overallScore >= 70 ? 
  'This feature meets TDD standards and is ready for implementation.' :
  'This feature needs additional refinement before implementation.'
}
`;

    return {
      success: true,
      message: evaluationMessage,
      state,
      nextStep: overallScore >= 70 ? 'exit' : 'conversation',
    };
  },
};

// Exit Step: Complete Workflow
const exitStep: WorkflowStep = {
  id: 'exit',
  name: 'Complete Refinement Workflow',
  description: 'Agent declares feature status and completes workflow',
  execute: async (context: WorkflowContext) => {
    const state = context.state as RefinementWorkflowState;
    
    const exitMessage = `
## TDD Refinement Session Complete

**Feature**: ${state.featureId}
**Final Score**: ${state.refinementScore}/100
**Status**: ${state.exitReason === 'tdd-ready' ? 'TDD-Ready ✅' : 'Abandoned ❌'}

### What Was Accomplished
${state.conversationHistory.length} conversation turns completed
${state.criteriaChecked.length} criteria validated

### Next Steps
${state.exitReason === 'tdd-ready' ? 
  '- Update feature PRD with refined requirements\n- Promote feature to implementation phase\n- Begin test-driven development' :
  '- Consider breaking down into smaller features\n- Revisit requirements with stakeholders\n- Reconsider feature scope and complexity'
}

### Workflow Status
This refinement session is now **COMPLETE**. The feature has been ${state.exitReason === 'tdd-ready' ? 'validated' : 'marked'} for ${state.exitReason === 'tdd-ready' ? 'implementation' : 'revision'}.
`;

    return {
      success: true,
      message: exitMessage,
      state,
      isComplete: true,
    };
  },
};

// Abandonment Step: Workflow Abandonment
const abandonStep: WorkflowStep = {
  id: 'abandon',
  name: 'Abandon Refinement Workflow',
  description: 'Agent or user abandons the refinement process',
  execute: async (context: WorkflowContext) => {
    const state = context.state as RefinementWorkflowState;
    
    state.phase = 'abandoned';
    state.exitReason = 'abandoned';

    const abandonMessage = `
## Refinement Session Abandoned

**Feature**: ${state.featureId}
**Reason**: User or agent requested abandonment

### Abandonment Options
- **Restart**: Begin new refinement session
- **Defer**: Save current state and return later
- **Reject**: Mark feature as not suitable for TDD

This workflow is now **ABANDONED**. No further refinement will occur.
`;

    return {
      success: true,
      message: abandonMessage,
      state,
      isComplete: true,
    };
  },
};

// Create the Refinement Workflow
export const refinementWorkflow = createWorkflow({
  name: 'TDD Refinement',
  description: 'Conversational TDD refinement workflow with Senior TDD Architect',
  triggerSchema: z.object({
    featureId: z.string(),
    userId: z.string().default('default-user'),
    initialMessage: z.string().optional(),
  }),
  steps: [
    entryStep,
    conversationStep,
    evaluationStep,
    exitStep,
    abandonStep,
  ],
  initialState: (trigger) => ({
    featureId: trigger.featureId,
    userId: trigger.userId,
    phase: 'entry' as const,
    criteriaChecked: [],
    conversationHistory: [],
  }),
});

// Workflow Management Functions
export class RefinementWorkflowManager {
  private activeWorkflows = new Map<string, any>();

  async startWorkflow(featureId: string, userId: string = 'default-user') {
    const workflow = refinementWorkflow.create({
      featureId,
      userId,
    });

    this.activeWorkflows.set(featureId, workflow);
    
    // Execute entry step
    const result = await workflow.execute('entry');
    return result;
  }

  async continueWorkflow(featureId: string, message: string) {
    const workflow = this.activeWorkflows.get(featureId);
    if (!workflow) {
      throw new Error(`No active workflow found for feature ${featureId}`);
    }

    const result = await workflow.execute('conversation', { message });
    return result;
  }

  async abandonWorkflow(featureId: string) {
    const workflow = this.activeWorkflows.get(featureId);
    if (!workflow) {
      throw new Error(`No active workflow found for feature ${featureId}`);
    }

    const result = await workflow.execute('abandon');
    this.activeWorkflows.delete(featureId);
    return result;
  }

  async getWorkflowStatus(featureId: string) {
    const workflow = this.activeWorkflows.get(featureId);
    if (!workflow) {
      return { status: 'not-found' };
    }

    return { 
      status: 'active',
      state: workflow.state,
    };
  }

  getRequirements() {
    return REFINEMENT_CRITERIA;
  }
}