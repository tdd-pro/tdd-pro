import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { mastra } from "../index";
import { listFeatures } from "@/tools/feature-tools";
// Import other tools as needed

// 1. Product Feature Clarity (via tool call)
const clarifyFeaturesStep = createStep({
  id: "clarify-features",
  inputSchema: z.object({ cwd: z.string() }),
  outputSchema: z.object({
    features: z.array(z.string()),
    needsMoreDetail: z.boolean(),
    clarificationPrompt: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const featuresResult = await listFeatures.execute({ context: { cwd: inputData.cwd } } as any);
    const features = featuresResult.activeFeatures || [];
    if (!features || features.length < 2) {
      return {
        features: [],
        needsMoreDetail: true,
        clarificationPrompt: "Please provide more detail about your product goal so I can suggest features.",
      };
    }
    return { features, needsMoreDetail: false };
  },
});

// 2. Technical Implementation Clarity (stubbed for now)
const clarifyImplementationStep = createStep({
  id: "clarify-implementation",
  inputSchema: z.object({
    features: z.array(z.string()),
    needsMoreDetail: z.boolean(),
    clarificationPrompt: z.string().optional(),
  }),
  outputSchema: z.object({
    implementationNotes: z.string(),
    needsMoreDetail: z.boolean(),
    clarificationPrompt: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    // Use features from previous step
    const notes = "Stubbed implementation notes.";
    if (!notes || notes.length < 20) {
      return {
        implementationNotes: "",
        needsMoreDetail: true,
        clarificationPrompt: "Please provide more technical detail or constraints.",
      };
    }
    return { implementationNotes: notes, needsMoreDetail: false };
  },
});

// 3. Phase Planning (stubbed for now)
const planPhasesStep = createStep({
  id: "plan-phases",
  inputSchema: z.object({ features: z.array(z.string()), implementationNotes: z.string() }),
  outputSchema: z.object({ phases: z.array(z.string()), acceptanceCriteria: z.array(z.string()), userApproved: z.boolean() }),
  execute: async ({ inputData }) => {
    // TODO: Replace with a tool call if you have one for phases
    return { phases: [], acceptanceCriteria: [], userApproved: false };
  },
});

// 4. Test Design for Next Phase (stubbed for now)
const designTestsStep = createStep({
  id: "design-tests",
  inputSchema: z.object({ acceptanceCriteria: z.array(z.string()) }),
  outputSchema: z.object({ testCases: z.array(z.string()), userApproved: z.boolean(), warning: z.string().optional() }),
  execute: async ({ inputData }) => {
    // TODO: Replace with a tool call if you have one for test cases
    return { testCases: [], userApproved: false, warning: "" };
  },
});

// 5. Finalize and Save (stubbed for now)
const finalizeStep = createStep({
  id: "finalize",
  inputSchema: z.object({ testCases: z.array(z.string()) }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData }) => {
    // Save test cases, update status, etc.
    return { success: true };
  },
});

// Compose the workflow
const tddPlanningWorkflow = createWorkflow({
  id: "tdd-planning",
  inputSchema: z.object({ cwd: z.string() }),
  outputSchema: z.object({ success: z.boolean() }),
})
  .then(clarifyFeaturesStep)
  .then(clarifyImplementationStep)
  // .then(planPhasesStep)
  // .then(designTestsStep)
  // .then(finalizeStep)
  .commit();

export { tddPlanningWorkflow };