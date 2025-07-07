import { vol, fs as memfs } from "memfs";
import yaml from "js-yaml";
import { test, expect, beforeEach } from "vitest";

import * as features from "@/lib/features";

beforeEach(() => {
  vol.reset();
});

test("createFeature adds a refinement feature with proper validation", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [],
      backlog: [] 
    })
  });
  
  const longDescription = "This is a comprehensive feature description that spans multiple paragraphs and provides detailed context about what this feature will accomplish and why it's important for the project.";
  
  const result = await features.createFeature(
    "/project", 
    "user-auth", 
    "User Authentication System", 
    longDescription, 
    "refinement", 
    memfs.promises
  );
  
  expect(result.refinement).toHaveLength(1);
  expect(result.refinement[0]).toEqual({
    id: "user-auth",
    name: "User Authentication System", 
    description: longDescription
  });
});

test("createFeature adds a backlog feature with proper validation", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [],
      backlog: [] 
    })
  });
  
  const longDescription = "This is a comprehensive feature description that spans multiple paragraphs and provides detailed context about what this feature will accomplish and why it's important for the project.";
  
  const result = await features.createFeature(
    "/project", 
    "analytics", 
    "Analytics Dashboard", 
    longDescription, 
    "backlog", 
    memfs.promises
  );
  
  expect(result.backlog).toHaveLength(1);
  expect(result.backlog[0]).toEqual({
    id: "analytics",
    name: "Analytics Dashboard", 
    description: longDescription
  });
});

test("createFeature throws error for missing name", async () => {
  await expect(
    features.createFeature("/project", "test", "", "Good description here with enough length to pass validation requirements.", "refinement", memfs.promises)
  ).rejects.toThrow("Feature name is required");
});

test("createFeature throws error for short description", async () => {
  await expect(
    features.createFeature("/project", "test", "Test Feature", "Short", "refinement", memfs.promises)
  ).rejects.toThrow("Feature description must be at least 50 characters");
});

test("getFeatures returns features from features/index.yml", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: ["feature1"], 
      planned: ["feature2"], 
      refinement: [{ id: "feature3", name: "Feature 3", description: "Description" }],
      backlog: []
    })
  });
  const result = await features.getFeatures("/project", memfs.promises);
  expect(result.approved.find(f => f.id === "feature1")).toBeDefined();
  expect(result.planned.find(f => f.id === "feature2")).toBeDefined();
  expect(result.refinement[0].id).toBe("feature3");
});

test("getFeatures returns empty structure when file doesn't exist", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/": null  // Create the .tdd-pro directory but no index file
  });
  const result = await features.getFeatures("/project", memfs.promises);
  expect(result).toEqual({ approved: [], planned: [], refinement: [], backlog: [] });
});

test("deleteFeature removes a feature from all arrays", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: ["foo"], 
      planned: ["bar"], 
      refinement: [{ id: "baz", name: "Baz", description: "Desc" }],
      backlog: [{ id: "qux", name: "Qux", description: "Desc" }]
    })
  });
  const result = await features.deleteFeature("/project", "baz", memfs.promises);
  expect(result.refinement).toHaveLength(0);
});

test("promoteFeature moves feature from refinement to planned", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [{ id: "test-feature", name: "Test", description: "Description" }],
      backlog: []
    })
  });
  const result = await features.promoteFeature("/project", "test-feature", "refinement", "planned", memfs.promises);
  expect(result.refinement).toHaveLength(0);
  expect(result.planned.find(f => f.id === "test-feature")).toBeDefined();
});

test("promoteFeature moves feature from planned to approved", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [{ id: "test-feature", name: "Test Feature", description: "Description" }], 
      refinement: [],
      backlog: []
    })
  });
  const result = await features.promoteFeature("/project", "test-feature", "planned", "approved", memfs.promises);
  expect(result.planned).toHaveLength(0);
  expect(result.approved.find(f => f.id === "test-feature")).toBeDefined();
});

test("updateFeature updates feature name and description", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [{ id: "test-feature", name: "Old Name", description: "Old description" }],
      backlog: []
    })
  });
  const result = await features.updateFeature("/project", "test-feature", {
    name: "New Name",
    description: "New description that is longer and more comprehensive"
  }, memfs.promises);
  
  const updatedFeature = result.refinement.find(f => f.id === "test-feature");
  expect(updatedFeature?.name).toBe("New Name");
  expect(updatedFeature?.description).toBe("New description that is longer and more comprehensive");
});

test("updateFeature can rename feature ID", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [{ id: "old-id", name: "Feature Name", description: "Description" }],
      backlog: []
    })
  });
  const result = await features.updateFeature("/project", "old-id", {
    id: "new-id"
  }, memfs.promises);
  
  expect(result.refinement.find(f => f.id === "old-id")).toBeUndefined();
  expect(result.refinement.find(f => f.id === "new-id")).toBeDefined();
});

test("getFeature returns all details for a specific feature", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/tui-service-mvp/index.yml": yaml.dump({
      id: "tui-service-mvp",
      name: "TUI Service MVP",
      status: "active",
      owner: "ctoivola",
      created: "2024-06-27",
      updated: "2024-06-27",
      description: "Build a minimal, interactive TUI for TDD-Pro with backend integration.",
      tags: ["tui", "mvp", "mastra"],
      related_docs: ["../../docs/PRODUCT_VISION.md"],
      dependencies: []
    }),
    "/project/.tdd-pro/features/tui-service-mvp/prd.md": `# Feature Brief\nThis is a brief.\n\n## Acceptance Criteria\n- Criteria 1\n- Criteria 2\n\n## Design Discussion\n- File tree here`,
    "/project/.tdd-pro/features/tui-service-mvp/tasks.yml": yaml.dump([
      {
        id: "setup-monorepo",
        name: "Setup Monorepo",
        status: "completed",
        description: "Scaffold the monorepo structure.",
        acceptance_criteria: ["Monorepo structure exists"],
      },
      {
        id: "backend-minimal-service",
        name: "Backend Minimal Service",
        status: "tentative",
        description: "Create a minimal backend service.",
        acceptance_criteria: ["Health endpoint available"],
      }
    ])
  });

  const result = await features.getFeature("/project", "tui-service-mvp", memfs.promises);
  expect(result.index.id).toBe("tui-service-mvp");
  expect(result.prd).toContain("# Feature Brief");
  expect(result.tasks).toHaveLength(2);
  expect(result.tasks[0].id).toBe("setup-monorepo");
});

test("refineFeature updates the prd.md for a feature", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/tui-service-mvp/prd.md": "Old content"
  });
  const markdown = `# Feature Brief\nNew brief\n\n## Acceptance Criteria\n- New criteria\n\n## Design Discussion\n- New design`;
  const result = await features.refineFeature("/project", "tui-service-mvp", markdown, memfs.promises);
  const prdContent = await memfs.promises.readFile("/project/.tdd-pro/features/tui-service-mvp/prd.md", "utf8");
  expect(prdContent).toBe(markdown);
  expect(result.success).toBe(true);
});

test("refineFeatureTasks updates the tasks.yml for a feature", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/tui-service-mvp/tasks.yml": yaml.dump([])
  });
  const tasks = [
    {
      id: "task-1",
      name: "Task 1",
      status: "pending",
      description: "Do something important.",
      acceptance_criteria: ["File exists"],
    },
    {
      id: "task-2",
      name: "Task 2",
      status: "pending",
      description: "Do something else.",
      acceptance_criteria: ["Tests pass"],
    }
  ];
  const result = await features.refineFeatureTasks("/project", "tui-service-mvp", tasks, memfs.promises);
  const tasksContent = yaml.load(await memfs.promises.readFile("/project/.tdd-pro/features/tui-service-mvp/tasks.yml", "utf8"));
  expect(tasksContent).toHaveLength(2);
  expect(tasksContent[0].id).toBe("task-1");
  expect(result.success).toBe(true);
});

test("getFeatureDocument returns existing PRD content", async () => {
  const prdContent = `# User Authentication

## Feature Brief

A comprehensive authentication system for user login and registration.

## Acceptance Criteria

- [ ] Users can register with email/password
- [ ] Users can login with credentials
- [ ] Session management is implemented

## Design Discussion

Using JWT tokens for session management with refresh token rotation.
`;

  vol.fromJSON({
    "/project/.tdd-pro/features/user-auth/prd.md": prdContent
  });

  const result = await features.getFeatureDocument("/project", "user-auth", memfs.promises);
  expect(result).toBe(prdContent);
});

test("getFeatureDocument creates default PRD when file doesn't exist", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/": null
  });

  const result = await features.getFeatureDocument("/project", "user-auth", memfs.promises);
  
  expect(result).toContain("# user-auth");
  expect(result).toContain("## Feature Brief");
  expect(result).toContain("## Acceptance Criteria");
  expect(result).toContain("## Design Discussion");
  expect(result).toContain("## Notes");
  
  // Verify the file was actually created
  const fileExists = await memfs.promises.stat("/project/.tdd-pro/features/user-auth/prd.md").then(() => true).catch(() => false);
  expect(fileExists).toBe(true);
});

test("updateFeatureDocument creates and writes PRD content", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/": null
  });

  const newContent = `# Analytics Dashboard

## Feature Brief

Real-time analytics dashboard showing user engagement metrics.

## Acceptance Criteria

- [ ] Display page views, unique visitors, and session duration
- [ ] Real-time updates every 30 seconds
- [ ] Export data as CSV or JSON

## Design Discussion

Using WebSockets for real-time updates and Chart.js for visualization.
`;

  await features.updateFeatureDocument("/project", "analytics", newContent, memfs.promises);
  
  const savedContent = await memfs.promises.readFile("/project/.tdd-pro/features/analytics/prd.md", "utf8");
  expect(savedContent.toString()).toBe(newContent);
});

test("updateFeatureDocument overwrites existing PRD content", async () => {
  const oldContent = "Old content here";
  const newContent = "New content here";

  vol.fromJSON({
    "/project/.tdd-pro/features/existing-feature/prd.md": oldContent
  });

  await features.updateFeatureDocument("/project", "existing-feature", newContent, memfs.promises);
  
  const savedContent = await memfs.promises.readFile("/project/.tdd-pro/features/existing-feature/prd.md", "utf8");
  expect(savedContent.toString()).toBe(newContent);
});

test("createFeature creates default prd.md and tasks.yml files", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [],
      backlog: [] 
    })
  });
  
  const longDescription = "This is a comprehensive feature description that spans multiple paragraphs and provides detailed context about what this feature will accomplish and why it's important for the project.";
  
  await features.createFeature(
    "/project", 
    "payment-system", 
    "Payment Processing System", 
    longDescription, 
    "refinement", 
    memfs.promises
  );
  
  // Check that prd.md was created
  const prdExists = await memfs.promises.stat("/project/.tdd-pro/features/payment-system/prd.md").then(() => true).catch(() => false);
  expect(prdExists).toBe(true);
  
  const prdContent = await memfs.promises.readFile("/project/.tdd-pro/features/payment-system/prd.md", "utf8");
  expect(prdContent.toString()).toContain("# Payment Processing System");
  expect(prdContent.toString()).toContain(longDescription);
  
  // Check that tasks.yml was created
  const tasksExists = await memfs.promises.stat("/project/.tdd-pro/features/payment-system/tasks.yml").then(() => true).catch(() => false);
  expect(tasksExists).toBe(true);
  
  const tasksContent = await memfs.promises.readFile("/project/.tdd-pro/features/payment-system/tasks.yml", "utf8");
  const tasks = yaml.load(tasksContent.toString()) as any[];
  expect(Array.isArray(tasks)).toBe(true);
  expect(tasks).toHaveLength(0); // Should be an empty array initially
});

test("createFeature doesn't overwrite existing prd.md and tasks.yml files", async () => {
  const existingPrd = "Existing PRD content";
  const existingTasks = [{ id: "existing-task", name: "Existing Task" }];
  
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [],
      backlog: [] 
    }),
    "/project/.tdd-pro/features/existing-feature/prd.md": existingPrd,
    "/project/.tdd-pro/features/existing-feature/tasks.yml": yaml.dump(existingTasks)
  });
  
  const longDescription = "This is a comprehensive feature description that spans multiple paragraphs and provides detailed context about what this feature will accomplish and why it's important for the project.";
  
  await features.createFeature(
    "/project", 
    "existing-feature", 
    "Existing Feature", 
    longDescription, 
    "refinement", 
    memfs.promises
  );
  
  // Check that existing files weren't overwritten
  const prdContent = await memfs.promises.readFile("/project/.tdd-pro/features/existing-feature/prd.md", "utf8");
  expect(prdContent).toBe(existingPrd);
  
  const tasksContent = await memfs.promises.readFile("/project/.tdd-pro/features/existing-feature/tasks.yml", "utf8");
  const tasks = yaml.load(tasksContent.toString()) as any[];
  expect(tasks).toEqual(existingTasks);
});

test("addCurrentFeature adds a feature to current features list", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [{ id: "feature-1", name: "Feature 1", description: "First feature" }],
      backlog: [] 
    })
  });
  
  const result = await features.addCurrentFeature("/project", "feature-1", memfs.promises);
  
  expect(result.current_features).toEqual(["feature-1"]);
});

test("addCurrentFeature doesn't duplicate features in current list", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [{ id: "feature-1", name: "Feature 1", description: "First feature" }],
      backlog: [],
      current_features: ["feature-1"]
    })
  });
  
  const result = await features.addCurrentFeature("/project", "feature-1", memfs.promises);
  
  expect(result.current_features).toEqual(["feature-1"]);
});

test("removeCurrentFeature removes a feature from current features list", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [
        { id: "feature-1", name: "Feature 1", description: "First feature" },
        { id: "feature-2", name: "Feature 2", description: "Second feature" }
      ],
      backlog: [],
      current_features: ["feature-1", "feature-2"]
    })
  });
  
  const result = await features.removeCurrentFeature("/project", "feature-1", memfs.promises);
  
  expect(result.current_features).toEqual(["feature-2"]);
});

test("setCurrentFeatures replaces the current features list", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [
        { id: "feature-1", name: "Feature 1", description: "First feature" },
        { id: "feature-2", name: "Feature 2", description: "Second feature" },
        { id: "feature-3", name: "Feature 3", description: "Third feature" }
      ],
      backlog: [],
      current_features: ["feature-1"]
    })
  });
  
  const result = await features.setCurrentFeatures("/project", ["feature-2", "feature-3"], memfs.promises);
  
  expect(result.current_features).toEqual(["feature-2", "feature-3"]);
});

test("migrateFeatures converts single current_feature to current_features array", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [{ id: "feature-1", name: "Feature 1", description: "First feature" }],
      backlog: [],
      current_feature: "feature-1"  // Old format
    })
  });
  
  const result = await features.migrateFeatures("/project", memfs.promises);
  
  expect(result.current_features).toEqual(["feature-1"]);
  expect(result.current_feature).toBeUndefined();
  
  // Verify the file was updated
  const fileContent = await memfs.promises.readFile("/project/.tdd-pro/features/index.yml", "utf8");
  const savedData = yaml.load(fileContent);
  expect(savedData.current_features).toEqual(["feature-1"]);
  expect(savedData.current_feature).toBeUndefined();
});

test("findTddProRoot ignores ~/.tdd-pro and finds project-local .tdd-pro (realistic home structure)", async () => {
  // Simulate a home install dir and a project dir under home
  vol.fromJSON({
    "/home/user/.tdd-pro/features/index.yml": yaml.dump({ approved: [], planned: [], refinement: [], backlog: [] }),
    "/home/user/project/.tdd-pro/features/index.yml": yaml.dump({ approved: [], planned: [], refinement: [], backlog: [] }),
    "/home/user/project/subdir/": null
  });
  // Patch process.env.HOME for the test
  const oldHome = process.env.HOME;
  process.env.HOME = "/home/user";
  // Patch memfs.promises to add a dummy glob function for compatibility
  (memfs.promises as any).glob = async () => [];
  // Import the function directly
  const { findTddProRoot } = require("@/lib/features");
  const result = await findTddProRoot("/home/user/project/subdir", memfs.promises);
  expect(result.success).toBe(true);
  expect(result.root).toBe("/home/user/project");
  // Restore HOME
  process.env.HOME = oldHome;
});
