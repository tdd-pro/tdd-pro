import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";

// Valid task status values
export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in-progress", 
  COMPLETED: "completed"
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

// Task schema (for reference, not enforced here)
export const TaskSchema = {
  id: "string",
  name: "string",
  status: "string", // Should be one of: pending, in-progress, completed
  description: "string?",
  acceptance_criteria: "string[]?",
  owner: "string?",
  created: "string?",
  updated: "string?",
  dependencies: "string[]?",
  notes: "string?",
};

// Helper: get tasks file path
export function getTasksPath(cwd: string, featureId: string) {
  return path.join(cwd, ".tdd-pro", "features", featureId, "tasks.yml");
}

// Helper: read tasks (returns array, never throws)
export async function readTasks(cwd: string, featureId: string, fsMod: any = fs): Promise<any[]> {
  const tasksPath = getTasksPath(cwd, featureId);
  try {
    const file = await fsMod.readFile(tasksPath, "utf8");
    const loaded = yaml.load(file);
    return Array.isArray(loaded) ? loaded : [];
  } catch {
    return [];
  }
}

// Helper: write tasks (overwrites file)
export async function writeTasks(cwd: string, featureId: string, tasks: any[], fsMod: any = fs) {
  const tasksPath = getTasksPath(cwd, featureId);
  await fsMod.mkdir(path.dirname(tasksPath), { recursive: true });
  await fsMod.writeFile(tasksPath, yaml.dump(tasks), "utf8");
}

// getTasks: List all tasks (high-level info)
export async function getTasks(cwd: string, featureId: string, fsMod: any = fs) {
  const tasks = await readTasks(cwd, featureId, fsMod);
  return tasks.map((t: any) => ({ id: t.id, name: t.name, status: t.status }));
}

// getTask: Get details for a specific task
export async function getTask(cwd: string, featureId: string, taskId: string, fsMod: any = fs) {
  const tasks = await readTasks(cwd, featureId, fsMod);
  const task = tasks.find((t: any) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  return task;
}

// setTasks: Replace all tasks for a feature
export async function setTasks(cwd: string, featureId: string, tasks: any[], fsMod: any = fs) {
  // Ensure unique IDs
  const ids = new Set();
  for (const t of tasks) {
    if (ids.has(t.id)) throw new Error(`Duplicate task ID: ${t.id}`);
    ids.add(t.id);
  }
  await writeTasks(cwd, featureId, tasks, fsMod);
  return { success: true };
}

// createTask: Add a new task
export async function createTask(cwd: string, featureId: string, task: any, fsMod: any = fs) {
  const tasks = await readTasks(cwd, featureId, fsMod);
  if (tasks.find((t: any) => t.id === task.id)) {
    throw new Error(`Task ID ${task.id} already exists`);
  }
  
  // Set default status if not provided
  const taskWithDefaults = {
    ...task,
    status: task.status || TASK_STATUS.PENDING
  };
  
  tasks.push(taskWithDefaults);
  await writeTasks(cwd, featureId, tasks, fsMod);
  return { success: true };
}

// updateTask: Update a specific task
export async function updateTask(cwd: string, featureId: string, taskId: string, updates: any, fsMod: any = fs) {
  const tasks = await readTasks(cwd, featureId, fsMod);
  const idx = tasks.findIndex((t: any) => t.id === taskId);
  if (idx === -1) throw new Error(`Task ${taskId} not found`);
  tasks[idx] = { ...tasks[idx], ...updates };
  await writeTasks(cwd, featureId, tasks, fsMod);
  return { success: true };
}

// deleteTask: Remove a specific task
export async function deleteTask(cwd: string, featureId: string, taskId: string, fsMod: any = fs) {
  let tasks = await readTasks(cwd, featureId, fsMod);
  const before = tasks.length;
  tasks = tasks.filter((t: any) => t.id !== taskId);
  if (tasks.length === before) throw new Error(`Task ${taskId} not found`);
  await writeTasks(cwd, featureId, tasks, fsMod);
  return { success: true };
}

// moveTask: Change the order of tasks
export async function moveTask(cwd: string, featureId: string, taskId: string, newIndex: number, fsMod: any = fs) {
  const tasks = await readTasks(cwd, featureId, fsMod);
  const idx = tasks.findIndex((t: any) => t.id === taskId);
  if (idx === -1) throw new Error(`Task ${taskId} not found`);
  const [task] = tasks.splice(idx, 1);
  if (newIndex < 0) newIndex = 0;
  if (newIndex > tasks.length) newIndex = tasks.length;
  tasks.splice(newIndex, 0, task);
  await writeTasks(cwd, featureId, tasks, fsMod);
  return { success: true };
}

// getNextActiveTask: Get the next incomplete task
export async function getNextActiveTask(cwd: string, featureId: string, fsMod: any = fs) {
  const tasks = await readTasks(cwd, featureId, fsMod);
  return tasks.find((t: any) => t.status !== TASK_STATUS.COMPLETED);
} 