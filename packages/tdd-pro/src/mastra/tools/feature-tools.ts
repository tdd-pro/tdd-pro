import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as features from "@/lib/features";

// Feature Item Schema
const FeatureItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

// Features Data Schema
const FeaturesDataSchema = z.object({
  approved: z.array(FeatureItemSchema),
  planned: z.array(FeatureItemSchema),
  refinement: z.array(FeatureItemSchema),
  backlog: z.array(FeatureItemSchema),
  current_features: z.array(z.string()).optional(),
  // Legacy support for old format
  current_feature: z.string().optional(),
});

// TDD-Pro MCP Tools: Persona Usage Guide
// - Planner/Refiner: Use createFeature, refineFeature, refineFeatureTasks, promoteFeature, updateFeature (for PRD/requirements only)
// - Implementation Developer: Use task tools (get-task, update-task, set-tasks, create-task, delete-task, move-task, etc.) to manage and mark tasks complete. Do NOT use updateFeature to mark tasks complete or update task status.

// Create Feature Tool
export const createFeature = createTool({
  id: "create-feature",
  description: "For Planner/Refiner persona: Create a new feature with detailed description in refinement or backlog status",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    id: z.string().describe("Feature ID (kebab-case)"),
    name: z.string().describe("Feature name"),
    description: z.string().min(50).describe("Detailed feature description (2-3 paragraphs minimum)"),
    status: z.enum(["refinement", "backlog"]).default("refinement").describe("Initial status"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: FeaturesDataSchema,
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const result = await features.createFeature(
        context.cwd,
        context.id,
        context.name,
        context.description,
        context.status
      );
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        data: { approved: [], planned: [], refinement: [], backlog: [] }, 
        error: String(error) 
      };
    }
  },
});

// List Features Tool
export const listFeatures = createTool({
  id: "list-features",
  description: "For all personas: Get all features organized by status (approved, planned, refinement, backlog)",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
  }),
  outputSchema: FeaturesDataSchema,
  execute: async ({ context }) => {
    return await features.getFeatures(context.cwd);
  },
});

// Promote Feature Tool
export const promoteFeature = createTool({
  id: "promote-feature",
  description: "For Planner/Refiner persona: Move a feature between statuses (refinement -> planned -> approved)",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID to promote"),
    fromStatus: z.enum(["refinement", "planned"]).describe("Current status"),
    toStatus: z.enum(["planned", "approved"]).describe("Target status"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: FeaturesDataSchema,
  }),
  execute: async ({ context }) => {
    const result = await features.promoteFeature(
      context.cwd,
      context.featureId,
      context.fromStatus,
      context.toStatus
    );
    return { success: true, data: result };
  },
});

// Update Feature Tool
export const updateFeature = createTool({
  id: "update-feature",
  description: "For Planner/Refiner persona: Update a feature's ID, name, or description (can rename folders). Use ONLY for updating feature metadata or PRD/requirements. Do NOT use for marking tasks complete or updating task status. For task status, use the task tools.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Current feature ID"),
    updates: z.object({
      id: z.string().optional().describe("New feature ID (will rename folder)"),
      name: z.string().optional().describe("New feature name"),
      description: z.string().optional().describe("New feature description"),
    }).describe("Fields to update"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: FeaturesDataSchema,
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const result = await features.updateFeature(context.cwd, context.featureId, context.updates);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        data: { approved: [], planned: [], refinement: [], backlog: [] }, 
        error: String(error) 
      };
    }
  },
});

// Delete Feature Tool
export const deleteFeature = createTool({
  id: "delete-feature",
  description: "For Planner/Refiner persona: Remove a feature from all statuses",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID to delete"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: FeaturesDataSchema,
  }),
  execute: async ({ context }) => {
    const result = await features.deleteFeature(context.cwd, context.featureId);
    return { success: true, data: result };
  },
});

// Get Feature Tool
export const getFeature = createTool({
  id: "get-feature",
  description: "For all personas: Retrieve all details for a specific feature, including its metadata (index.yml), product requirements doc (prd.md), and associated tasks (tasks.yml). Use this tool when you need the full context for a feature before refining, planning, or implementing it.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
  }),
  outputSchema: z.object({
    index: z.any().describe("Feature metadata from index.yml"),
    prd: z.string().describe("Feature requirements and design markdown from prd.md, may be empty if not present."),
    tasks: z.array(z.any()).describe("List of tasks from tasks.yml, may be empty if not present."),
  }),
  execute: async ({ context }) => {
    const { getFeature } = await import("../lib/features");
    return await getFeature(context.cwd, context.featureId);
  },
});

// Refine Feature Tool
export const refineFeature = createTool({
  id: "refine-feature",
  description: "For Planner/Refiner persona: Update the product requirements and design markdown (prd.md) for a feature. Use this tool to provide or update a detailed feature brief, acceptance criteria, and design discussion in markdown format. This is for requirements/design only, not for marking tasks complete.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    markdown: z.string().describe("Full markdown document for the feature's prd.md, including sections: Feature Brief, Acceptance Criteria, Design Discussion."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { refineFeature } = await import("../lib/features");
    return await refineFeature(context.cwd, context.featureId, context.markdown);
  },
});


// TDD-Pro How It Works Tool
export const tddProHowItWorks = createTool({
  id: "tdd-pro-how-it-works",
  description: `Returns a prompt explaining how TDD-Pro works and how agents should use it. Use this tool to onboard yourself or another agent to the TDD-Pro workflow. It will return the contents of .tdd-pro/tdd-pro.md if it exists, otherwise a default guide from the codebase.`,
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
  }),
  outputSchema: z.object({
    content: z.string().describe("Markdown content explaining TDD-Pro usage and workflow."),
    source: z.string().describe("Source file path used for the returned content."),
  }),
  execute: async ({ context }) => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const tddProPath = path.join(context.cwd, ".tdd-pro", "tdd-pro.md");
    let content = "";
    let source = tddProPath;
    try {
      content = await fs.readFile(tddProPath, "utf8");
    } catch {
      // fallback to src/mastra/tools/tdd-pro.md
      const fallbackPath = path.join(__dirname, "tdd-pro.md");
      try {
        content = await fs.readFile(fallbackPath, "utf8");
        source = fallbackPath;
      } catch {
        content = "TDD-Pro onboarding guide not found.";
        source = fallbackPath;
      }
    }
    return { content, source };
  },
});

// Archive Feature Tool
export const archiveFeature = createTool({
  id: "archive-feature",
  description: "For Planner/Refiner persona: Archive a feature by moving its folder to .tdd-pro/archived-features and removing it from the features index. Use this to clean up completed or deprecated features while preserving their history.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case) to archive"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.any().describe("Updated features data from index.yml after archiving."),
  }),
  execute: async ({ context }) => {
    const { archiveFeature } = await import("../lib/features");
    return await archiveFeature(context.cwd, context.featureId);
  },
});

// Get Feature Document Tool
export const getFeatureDocument = createTool({
  id: "get-feature-document",
  description: "Get the PRD markdown document for a feature",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    content: z.string().optional().describe("Markdown content of the PRD document"),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { getFeatureDocument } = await import("../lib/features");
      const content = await getFeatureDocument(context.cwd, context.featureId);
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

// Update Feature Document Tool
export const updateFeatureDocument = createTool({
  id: "update-feature-document",
  description: "Update the PRD markdown document for a feature",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    content: z.string().describe("Markdown content to write to the PRD document"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { updateFeatureDocument } = await import("../lib/features");
      await updateFeatureDocument(context.cwd, context.featureId, context.content);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

// Add Current Feature Tool
export const addCurrentFeature = createTool({
  id: "add-current-feature",
  description: "Add a feature to the current features list for focused work",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID to add to current list"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: FeaturesDataSchema,
  }),
  execute: async ({ context }) => {
    const result = await features.addCurrentFeature(context.cwd, context.featureId);
    return { success: true, data: result };
  },
});

// Remove Current Feature Tool
export const removeCurrentFeature = createTool({
  id: "remove-current-feature", 
  description: "Remove a feature from the current features list",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID to remove from current list"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: FeaturesDataSchema,
  }),
  execute: async ({ context }) => {
    const result = await features.removeCurrentFeature(context.cwd, context.featureId);
    return { success: true, data: result };
  },
});

// Set Current Features Tool
export const setCurrentFeatures = createTool({
  id: "set-current-features",
  description: "Set the complete list of current features (replaces existing list)",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureIds: z.array(z.string()).describe("Array of feature IDs to set as current"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: FeaturesDataSchema,
  }),
  execute: async ({ context }) => {
    const result = await features.setCurrentFeatures(context.cwd, context.featureIds);
    return { success: true, data: result };
  },
});

// Export all tools
export const featureTools = {
  createFeature,
  listFeatures,
  updateFeature,
  promoteFeature,
  deleteFeature,
  getFeature,
  refineFeature,
  tddProHowItWorks,
  archiveFeature,
  getFeatureDocument,
  updateFeatureDocument,
  addCurrentFeature,
  removeCurrentFeature,
  setCurrentFeatures,
}; 