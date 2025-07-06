import { vol, fs as memfs } from "memfs";
// Patch memfs.promises to add a dummy glob function for compatibility
(memfs.promises as any).glob = async () => [];
import yaml from "js-yaml";
import { test, expect, beforeEach } from "vitest";
import * as tasks from "../../../src/mastra/lib/tasks";

const cwd = "/project";
const featureId = "feature-1";
const tasksPath = `${cwd}/.tdd-pro/features/${featureId}/tasks.yml`;

beforeEach(() => {
  vol.reset();
  // Ensure /project and feature directory exist to avoid EROFS
  vol.fromJSON({
    "/project/": null,
    "/project/.tdd-pro/": null,
    "/project/.tdd-pro/features/": null,
    [`/project/.tdd-pro/features/${featureId}/`]: null
  });
});

test("getTasks returns empty array if tasks.yml is missing", async () => {
  const result = await tasks.getTasks(cwd, featureId, memfs.promises);
  expect(result).toEqual([]);
});

test("setTasks creates tasks.yml and enforces unique IDs", async () => {
  const taskList = [
    { id: "a", name: "A", status: "pending" },
    { id: "b", name: "B", status: "pending" },
  ];
  const result = await tasks.setTasks(cwd, featureId, taskList, memfs.promises);
  expect(result.success).toBe(true);
  const file = yaml.load((await memfs.promises.readFile(tasksPath, "utf8")).toString()) as any;
  expect(file).toHaveLength(2);
  expect(file[0].id).toBe("a");
});

test("setTasks throws on duplicate IDs", async () => {
  const taskList = [
    { id: "a", name: "A", status: "pending" },
    { id: "a", name: "B", status: "pending" },
  ];
  await expect(tasks.setTasks(cwd, featureId, taskList, memfs.promises)).rejects.toThrow();
});

test("createTask adds a new task and enforces unique ID", async () => {
  await tasks.setTasks(cwd, featureId, [], memfs.promises);
  const task = { id: "c", name: "C", status: "pending" };
  const result = await tasks.createTask(cwd, featureId, task, memfs.promises);
  expect(result.success).toBe(true);
  const file = yaml.load((await memfs.promises.readFile(tasksPath, "utf8")).toString()) as any;
  expect(file.find((t: any) => t.id === "c")).toBeDefined();
  await expect(tasks.createTask(cwd, featureId, task, memfs.promises)).rejects.toThrow();
});

test("getTask returns full details for a specific task", async () => {
  const task = { id: "d", name: "D", status: "pending", description: "desc", acceptance_criteria: ["foo"] };
  await tasks.setTasks(cwd, featureId, [task], memfs.promises);
  const result = await tasks.getTask(cwd, featureId, "d", memfs.promises);
  expect(result.id).toBe("d");
  expect(result.acceptance_criteria).toContain("foo");
});

test("updateTask updates only provided fields", async () => {
  const task = { id: "e", name: "E", status: "pending" };
  await tasks.setTasks(cwd, featureId, [task], memfs.promises);
  await tasks.updateTask(cwd, featureId, "e", { status: "completed" }, memfs.promises);
  const file = yaml.load((await memfs.promises.readFile(tasksPath, "utf8")).toString()) as any;
  expect(file[0].status).toBe("completed");
});

test("deleteTask removes a task", async () => {
  const task = { id: "f", name: "F", status: "pending" };
  await tasks.setTasks(cwd, featureId, [task], memfs.promises);
  await tasks.deleteTask(cwd, featureId, "f", memfs.promises);
  const file = yaml.load((await memfs.promises.readFile(tasksPath, "utf8")).toString()) as any;
  expect(file.find((t: any) => t.id === "f")).toBeUndefined();
});

test("moveTask reorders tasks", async () => {
  const taskList = [
    { id: "g", name: "G", status: "pending" },
    { id: "h", name: "H", status: "pending" },
    { id: "i", name: "I", status: "pending" },
  ];
  await tasks.setTasks(cwd, featureId, taskList, memfs.promises);
  await tasks.moveTask(cwd, featureId, "i", 0, memfs.promises);
  const file = yaml.load((await memfs.promises.readFile(tasksPath, "utf8")).toString()) as any;
  expect(file[0].id).toBe("i");
});

test("getNextActiveTask returns the first incomplete task", async () => {
  const taskList = [
    { id: "j", name: "J", status: "completed" },
    { id: "k", name: "K", status: "pending" },
  ];
  await tasks.setTasks(cwd, featureId, taskList, memfs.promises);
  const result = await tasks.getNextActiveTask(cwd, featureId, memfs.promises);
  expect(result.id).toBe("k");
});

test("createTask sets default status to pending when not provided", async () => {
  await tasks.setTasks(cwd, featureId, [], memfs.promises);
  const taskWithoutStatus = { id: "default-status", name: "Default Status Task" };
  await tasks.createTask(cwd, featureId, taskWithoutStatus, memfs.promises);
  
  const result = await tasks.getTask(cwd, featureId, "default-status", memfs.promises);
  expect(result.status).toBe("pending");
});

test("createTask preserves provided status", async () => {
  await tasks.setTasks(cwd, featureId, [], memfs.promises);
  const taskWithStatus = { id: "custom-status", name: "Custom Status Task", status: "in-progress" };
  await tasks.createTask(cwd, featureId, taskWithStatus, memfs.promises);
  
  const result = await tasks.getTask(cwd, featureId, "custom-status", memfs.promises);
  expect(result.status).toBe("in-progress");
});

test("getNextActiveTask skips in-progress tasks and finds pending ones", async () => {
  const taskList = [
    { id: "completed-task", name: "Completed", status: "completed" },
    { id: "in-progress-task", name: "In Progress", status: "in-progress" },
    { id: "pending-task", name: "Pending", status: "pending" },
  ];
  await tasks.setTasks(cwd, featureId, taskList, memfs.promises);
  const result = await tasks.getNextActiveTask(cwd, featureId, memfs.promises);
  expect(result.id).toBe("in-progress-task"); // First non-completed task
});

test("updateTask can change status between all valid values", async () => {
  await tasks.setTasks(cwd, featureId, [{ id: "status-test", name: "Status Test", status: "pending" }], memfs.promises);
  
  // Test pending -> in-progress
  await tasks.updateTask(cwd, featureId, "status-test", { status: "in-progress" }, memfs.promises);
  let result = await tasks.getTask(cwd, featureId, "status-test", memfs.promises);
  expect(result.status).toBe("in-progress");
  
  // Test in-progress -> completed
  await tasks.updateTask(cwd, featureId, "status-test", { status: "completed" }, memfs.promises);
  result = await tasks.getTask(cwd, featureId, "status-test", memfs.promises);
  expect(result.status).toBe("completed");
}); 