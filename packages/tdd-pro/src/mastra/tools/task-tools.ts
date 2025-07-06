import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as tasks from "@/lib/tasks";

// TDD-Pro Task Tools: Persona Usage Guide
// - Planner/Refiner: Use refineFeature, refineFeatureTasks, etc. for requirements and task breakdown.
// - Implementation Developer: Use these task tools to manage and update tasks, including marking them complete. Do NOT use updateFeature to mark tasks complete or update task status.

// Export task status constants for external use
export const TASK_STATUS = tasks.TASK_STATUS;

// Task status enum for zod validation
const TaskStatusEnum = z.enum(["pending", "in-progress", "completed"]);

// Task schema for zod
const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: TaskStatusEnum,
  description: z.string().optional(),
  acceptance_criteria: z.array(z.string()).optional(),
  owner: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// getTasks: For Implementation Developer persona: List all tasks for a feature, returning only high-level info (id, name, status). Use this to get an overview of the work breakdown.
export const getTasks = createTool({
  id: "get-tasks",
  description: "List all tasks for a feature, returning only high-level info (id, name, status). Use this to get an overview of the work breakdown.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
  }),
  outputSchema: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: TaskStatusEnum,
  })),
  execute: async ({ context }) => {
    return await tasks.getTasks(context.cwd, context.featureId);
  },
});

// getTask: For Implementation Developer persona: Get full details for a specific task by ID, including description and evaluation criteria.
export const getTask = createTool({
  id: "get-task",
  description: "Get full details for a specific task by ID, including description and evaluation criteria.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    taskId: z.string().describe("Task ID"),
  }),
  outputSchema: TaskSchema,
  execute: async ({ context }) => {
    return await tasks.getTask(context.cwd, context.featureId, context.taskId);
  },
});

// setTasks: For Implementation Developer persona: Replace all tasks for a feature. Use this for initial planning or major updates. The order of tasks in the array is authoritative.
export const setTasks = createTool({
  id: "set-tasks",
  description: "Replace all tasks for a feature. Use this for initial planning or major updates. The order of tasks in the array is authoritative.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    tasks: z.array(TaskSchema).describe("Full list of tasks to set for the feature."),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ context }) => {
    return await tasks.setTasks(context.cwd, context.featureId, context.tasks);
  },
});

// createTask: For Implementation Developer persona: Add a new task to a feature. Task ID must be unique.
export const createTask = createTool({
  id: "create-task",
  description: "Add a new task to a feature. Task ID must be unique.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    task: TaskSchema.describe("Task object to add."),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ context }) => {
    return await tasks.createTask(context.cwd, context.featureId, context.task);
  },
});

// updateTask: For Implementation Developer persona: Update a specific task by ID. Only provided fields will be updated. Use this to mark a task complete or update its status.
export const updateTask = createTool({
  id: "update-task",
  description: "Update a specific task by ID. Only provided fields will be updated.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    taskId: z.string().describe("Task ID to update"),
    updates: TaskSchema.partial().describe("Fields to update for the task."),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ context }) => {
    return await tasks.updateTask(context.cwd, context.featureId, context.taskId, context.updates);
  },
});

// deleteTask: For Implementation Developer persona: Delete a specific task by ID.
export const deleteTask = createTool({
  id: "delete-task",
  description: "Delete a specific task by ID.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    taskId: z.string().describe("Task ID to delete"),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ context }) => {
    return await tasks.deleteTask(context.cwd, context.featureId, context.taskId);
  },
});

// moveTask: For Implementation Developer persona: Move a task to a new position in the task list. Use this to reorder tasks for a feature.
export const moveTask = createTool({
  id: "move-task",
  description: "Move a task to a new position in the task list. Use this to reorder tasks for a feature.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    taskId: z.string().describe("Task ID to move"),
    newIndex: z.number().describe("New zero-based index for the task."),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ context }) => {
    return await tasks.moveTask(context.cwd, context.featureId, context.taskId, context.newIndex);
  },
});

// getNextActiveTask: For Implementation Developer persona: Get the next active/incomplete task for a feature. Returns the first task whose status is not "completed".
export const getNextActiveTask = createTool({
  id: "get-next-active-task",
  description: "Get the next active/incomplete task for a feature. Returns the first task whose status is not 'completed'.",
  inputSchema: z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
  }),
  outputSchema: TaskSchema.optional(),
  execute: async ({ context }) => {
    return await tasks.getNextActiveTask(context.cwd, context.featureId);
  },
});

export const taskTools = {
  getTasks,
  getTask,
  setTasks,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  getNextActiveTask,
}; 