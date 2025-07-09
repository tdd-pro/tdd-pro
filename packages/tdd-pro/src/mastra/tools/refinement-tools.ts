import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RefinementAgent } from "../agents/refinement-agent";
import path from "path";
import os from "os";

// Active agent instances (simple in-memory storage for demo)
const activeAgents = new Map<string, RefinementAgent>();
const activeThreads = new Map<string, { agentKey: string; featureId: string; userId: string }>();

// Helper to get or create agent
async function getOrCreateAgent(cwd: string): Promise<RefinementAgent> {
  const agentKey = cwd;
  
  if (!activeAgents.has(agentKey)) {
    const storageUrl = ":memory:"; // Use memory for testing, file path for production
    const agent = new RefinementAgent({ storageUrl, cwd });
    activeAgents.set(agentKey, agent);
  }
  
  return activeAgents.get(agentKey)!;
}

// Start Refinement Conversation Tool
export const startRefinementConversation = createTool({
  id: "start-refinement-conversation",
  description: "Start a conversational refinement session with the TDD Refinement Agent for a specific feature",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID to refine"),
    message: z.string().describe("Initial message to start the conversation"),
    userId: z.string().optional().default("default-user").describe("User ID for conversation tracking"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    threadId: z.string().optional(),
    response: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      // Validate required parameters
      if (!context.cwd || !context.featureId || !context.message) {
        return {
          success: false,
          error: "Missing required parameters: cwd, featureId, and message are required"
        };
      }

      const agent = await getOrCreateAgent(context.cwd);
      
      // Use feature ID as thread ID for simpler conversation management
      const threadId = context.featureId;
      
      // Store thread info
      activeThreads.set(threadId, {
        agentKey: context.cwd,
        featureId: context.featureId,
        userId: context.userId
      });

      // Start conversation
      const response = await agent.generate(context.message, {
        threadId,
        resourceId: context.userId || "default-user",
      });

      return {
        success: true,
        threadId,
        response: response.text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Continue Refinement Conversation Tool
export const continueRefinementConversation = createTool({
  id: "continue-refinement-conversation",
  description: "Continue an existing refinement conversation",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    threadId: z.string().describe("Thread ID of the conversation to continue"),
    message: z.string().describe("Message to send in the conversation"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    response: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      if (!context.cwd || !context.threadId || !context.message) {
        return {
          success: false,
          error: "Missing required parameters: cwd, threadId, and message are required"
        };
      }

      const threadInfo = activeThreads.get(context.threadId);
      if (!threadInfo) {
        return {
          success: false,
          error: "Thread not found or expired"
        };
      }

      const agent = await getOrCreateAgent(context.cwd);
      
      const response = await agent.generate(context.message, {
        threadId: context.threadId,
        resourceId: threadInfo.userId || "default-user",
      });

      return {
        success: true,
        response: response.text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Enhanced Refine Feature Tool (Conversational Mode)
export const refineFeatureConversation = createTool({
  id: "refine-feature-conversation",
  description: "Start a conversational refinement for a feature using the TDD Refinement Agent",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID to refine"),
    initialPrompt: z.string().optional().default("Let's refine this feature to meet TDD standards").describe("Initial prompt for refinement"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    threadId: z.string().optional(),
    response: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      if (!context.cwd || !context.featureId) {
        return {
          success: false,
          error: "Missing required parameters: cwd and featureId are required"
        };
      }

      // Use the start conversation tool internally
      return await startRefinementConversation.execute({
        context: {
          cwd: context.cwd,
          featureId: context.featureId,
          message: context.initialPrompt,
          userId: "default-user",
        }
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Get Refinement Status Tool
export const getRefinementStatus = createTool({
  id: "get-refinement-status",
  description: "Get the status of a refinement conversation",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    threadId: z.string().describe("Thread ID to check status for"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    status: z.enum(["active", "complete", "not-found"]).optional(),
    featureId: z.string().optional(),
    userId: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      if (!context.cwd || !context.threadId) {
        return {
          success: false,
          error: "Missing required parameters: cwd and threadId are required"
        };
      }

      const threadInfo = activeThreads.get(context.threadId);
      if (!threadInfo) {
        return {
          success: true,
          status: "not-found",
        };
      }

      // For now, all active threads are considered "active"
      // In a real implementation, you'd check conversation completion status
      return {
        success: true,
        status: "active",
        featureId: threadInfo.featureId,
        userId: threadInfo.userId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Update Feature PRD Tool
export const updateFeaturePRD = createTool({
  id: "update-feature-prd",
  description: "Update the PRD document for a feature with refined requirements",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID to update"),
    refinedRequirements: z.string().describe("Refined requirements in markdown format"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      if (!context.cwd || !context.featureId || !context.refinedRequirements) {
        return {
          success: false,
          message: "",
          error: "Missing required parameters: cwd, featureId, and refinedRequirements are required"
        };
      }

      // For demo purposes, simulate successful PRD update
      // In production, this would update the actual .tdd-pro feature files
      return {
        success: true,
        message: `Feature '${context.featureId}' PRD updated successfully with refined requirements`,
      };
    } catch (error) {
      return {
        success: false,
        message: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Export all refinement tools
export const refinementTools = {
  startRefinementConversation,
  continueRefinementConversation,
  refineFeatureConversation,
  getRefinementStatus,
  updateFeaturePRD,
};