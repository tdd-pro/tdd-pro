import { vol, fs as memfs } from "memfs";
// Patch memfs.promises to add a dummy glob function for compatibility
(memfs.promises as any).glob = async () => [];
import { test, expect, beforeEach } from "vitest";
import yaml from "js-yaml";
import * as featuresModule from "../../../src/mastra/lib/features";
import { createFeature } from "../../../src/mastra/tools/feature-tools";

const cwd = "/project";
const featureId = "archive-me";
const featuresPath = `${cwd}/.tdd-pro/features`;
const archivedPath = `${cwd}/.tdd-pro/archived-features`;
const indexPath = `${featuresPath}/index.yml`;

beforeEach(() => {
  vol.reset();
  // Ensure .tdd-pro directory exists for all tests
  vol.fromJSON({
    "/project/.tdd-pro/": null,
    "/project/.tdd-pro/features/": null,
    "/project/.tdd-pro/features/index.yml": yaml.dump({
      approved: [{ id: "foo", name: "Foo", description: "desc" }],
      planned: [],
      refinement: [],
      backlog: []
    }),
    "/project/.tdd-pro/features/foo/": null,
    // Optionally, files inside the feature folder:
    "/project/.tdd-pro/features/foo/prd.md": "# PRD for Foo"
  });
});

test("createFeature tool creates a feature in refinement", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [],
      backlog: [] 
    })
  });
  
  // Mock the features module to use memfs
  const result = await featuresModule.createFeature(
    "/project",
    "user-auth",
    "User Authentication System", 
    "This comprehensive feature will implement a full user authentication system including login, registration, password reset, and session management. The system will be built with security best practices and will integrate with our existing user management infrastructure to provide seamless user experience.",
    "refinement",
    memfs.promises
  );
  
  expect(result.refinement).toHaveLength(1);
  expect(result.refinement[0]).toEqual({
    id: "user-auth",
    name: "User Authentication System",
    description: expect.stringContaining("comprehensive feature")
  });
});

test("createFeature tool creates feature folder structure with files", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [],
      backlog: [] 
    })
  });
  
  const longDescription = "This comprehensive feature will implement a full user authentication system including login, registration, password reset, and session management. The system will be built with security best practices and will integrate with our existing user management infrastructure to provide seamless user experience.";
  
  // Test the actual createFeature tool function
  const result = await featuresModule.createFeature(
    "/project",
    "payment-gateway",
    "Payment Gateway Integration",
    longDescription,
    "refinement",
    memfs.promises
  );
  
  // Verify feature was added to index
  expect(result.refinement).toHaveLength(1);
  expect(result.refinement[0].id).toBe("payment-gateway");
  
  // Verify feature folder was created
  const featureFolderExists = await memfs.promises.stat("/project/.tdd-pro/features/payment-gateway").then(() => true).catch(() => false);
  expect(featureFolderExists).toBe(true);
  
  // Verify prd.md was created with correct content
  const prdExists = await memfs.promises.stat("/project/.tdd-pro/features/payment-gateway/prd.md").then(() => true).catch(() => false);
  expect(prdExists).toBe(true);
  
  const prdContent = await memfs.promises.readFile("/project/.tdd-pro/features/payment-gateway/prd.md", "utf8");
  expect(prdContent).toContain("# Payment Gateway Integration");
  expect(prdContent).toContain(longDescription);
  expect(prdContent).toContain("## Feature Brief");
  expect(prdContent).toContain("## Acceptance Criteria");
  expect(prdContent).toContain("## Design Discussion");
  
  // Verify tasks.yml was created as empty array
  const tasksExists = await memfs.promises.stat("/project/.tdd-pro/features/payment-gateway/tasks.yml").then(() => true).catch(() => false);
  expect(tasksExists).toBe(true);
  
  const tasksContent = await memfs.promises.readFile("/project/.tdd-pro/features/payment-gateway/tasks.yml", "utf8");
  const tasks = yaml.load(tasksContent);
  expect(Array.isArray(tasks)).toBe(true);
  expect(tasks).toHaveLength(0);
});

test("listFeatures tool returns all features", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": `
approved:
  - "feature1"
planned:
  - "feature2"  
refinement:
  - id: "feature3"
    name: "Feature 3"
    description: "Description for feature 3"
backlog:
  - id: "feature4"
    name: "Feature 4"
    description: "Description for feature 4"
`
  });
  
  const result = await featuresModule.getFeatures("/project", memfs.promises);
  
  expect(result.approved.find(f => f.id === "feature1")).toBeDefined();
  expect(result.planned.find(f => f.id === "feature2")).toBeDefined();
  expect(result.refinement[0].id).toBe("feature3");
  expect(result.backlog[0].id).toBe("feature4");
});

test("promoteFeature tool moves feature from refinement to planned", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": `
approved: []
planned: []
refinement:
  - id: "test-feature"
    name: "Test Feature"
    description: "A test feature description"
backlog: []
`
  });
  
  const result = await featuresModule.promoteFeature(
    "/project",
    "test-feature",
    "refinement",
    "planned",
    memfs.promises
  );
  
  expect(result.refinement).toHaveLength(0);
  expect(result.planned.find(f => f.id === "test-feature")).toBeDefined();
});

test("createFeature tool handles validation errors", async () => {
  vol.fromJSON({});
  
  await expect(
    featuresModule.createFeature(
      "/project",
      "test",
      "Test",
      "Short description",
      "refinement",
      memfs.promises
    )
  ).rejects.toThrow("50 characters");
});

test("archiveFeature archives a feature and removes it from index", async () => {
  vol.fromJSON({
    ["/project/.tdd-pro/archived-features/"]: null,
    [`${featuresPath}/${featureId}/index.yml`]: yaml.dump({ id: featureId, name: "Archive Me", description: "desc" }),
    [indexPath]: yaml.dump({
      approved: [{ id: featureId, name: "Archive Me", description: "desc" }],
      planned: [], refinement: [], backlog: []
    }),
    [`${featuresPath}/${featureId}/`]: null
  });
  const result = await featuresModule.archiveFeature(cwd, featureId, memfs.promises);
  expect(result.success).toBe(true);
  // Folder moved
  const archived = await memfs.promises.stat(`${archivedPath}/${featureId}`);
  expect(archived.isDirectory()).toBe(true);
  // Removed from index
  const indexBuf = await memfs.promises.readFile(indexPath);
  const index = yaml.load(indexBuf.toString()) as any;
  expect(index.approved.find((f: any) => f.id === featureId)).toBeUndefined();
});

test("archiveFeature throws if feature does not exist in index", async () => {
  vol.fromJSON({
    [indexPath]: yaml.dump({ approved: [], planned: [], refinement: [], backlog: [] }),
    ["/project/.tdd-pro/archived-features/"]: null,
    ["/project/.tdd-pro/features/"]: null
  });
  await expect(featuresModule.archiveFeature(cwd, featureId, memfs.promises)).rejects.toThrow();
});

test("archiveFeature creates archived-features dir if missing", async () => {
  vol.fromJSON({
    [`${featuresPath}/${featureId}/index.yml`]: yaml.dump({ id: featureId, name: "Archive Me", description: "desc" }),
    [indexPath]: yaml.dump({
      planned: [{ id: featureId, name: "Archive Me", description: "desc" }],
      approved: [], refinement: [], backlog: []
    }),
    [`${featuresPath}/${featureId}/`]: null
  });
  // Remove archived-features dir if present
  try { await memfs.promises.rmdir(archivedPath); } catch {}
  const result = await featuresModule.archiveFeature(cwd, featureId, memfs.promises);
  expect(result.success).toBe(true);
  const archived = await memfs.promises.stat(`${archivedPath}/${featureId}`);
  expect(archived.isDirectory()).toBe(true);
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

  const result = await featuresModule.getFeatureDocument("/project", "user-auth", memfs.promises);
  expect(result).toBe(prdContent);
});

test("getFeatureDocument creates default PRD when file doesn't exist", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/": {}
  });

  const result = await featuresModule.getFeatureDocument("/project", "new-feature", memfs.promises);
  
  expect(result).toContain("# new-feature");
  expect(result).toContain("## Feature Brief");
  expect(result).toContain("## Acceptance Criteria");
  expect(result).toContain("## Design Discussion");
  expect(result).toContain("## Notes");
  
  // Verify the file was actually created
  const fileExists = await memfs.promises.stat("/project/.tdd-pro/features/new-feature/prd.md").then(() => true).catch(() => false);
  expect(fileExists).toBe(true);
});

test("updateFeatureDocument creates and writes PRD content", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/": {}
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

  await featuresModule.updateFeatureDocument("/project", "analytics", newContent, memfs.promises);
  
  const savedContent = await memfs.promises.readFile("/project/.tdd-pro/features/analytics/prd.md", "utf8");
  expect(savedContent).toBe(newContent);
});

test("updateFeatureDocument overwrites existing PRD content", async () => {
  const oldContent = "Old content here";
  const newContent = "New content here";

  vol.fromJSON({
    "/project/.tdd-pro/features/existing-feature/prd.md": oldContent
  });

  await featuresModule.updateFeatureDocument("/project", "existing-feature", newContent, memfs.promises);
  
  const savedContent = await memfs.promises.readFile("/project/.tdd-pro/features/existing-feature/prd.md", "utf8");
  expect(savedContent).toBe(newContent);
});

test("addCurrentFeature tool adds feature to current list", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [{ id: "feature-1", name: "Feature 1", description: "Test feature" }],
      backlog: []
    })
  });
  
  const result = await featuresModule.addCurrentFeature("/project", "feature-1", memfs.promises);
  
  expect(result.current_features).toEqual(["feature-1"]);
});

test("removeCurrentFeature tool removes feature from current list", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [
        { id: "feature-1", name: "Feature 1", description: "Test feature 1" },
        { id: "feature-2", name: "Feature 2", description: "Test feature 2" }
      ],
      backlog: [],
      current_features: ["feature-1", "feature-2"]
    })
  });
  
  const result = await featuresModule.removeCurrentFeature("/project", "feature-1", memfs.promises);
  
  expect(result.current_features).toEqual(["feature-2"]);
});

test("setCurrentFeatures tool replaces current features list", async () => {
  vol.fromJSON({
    "/project/.tdd-pro/features/index.yml": yaml.dump({ 
      approved: [], 
      planned: [], 
      refinement: [
        { id: "feature-1", name: "Feature 1", description: "Test feature 1" },
        { id: "feature-2", name: "Feature 2", description: "Test feature 2" },
        { id: "feature-3", name: "Feature 3", description: "Test feature 3" }
      ],
      backlog: [],
      current_features: ["feature-1"]
    })
  });
  
  const result = await featuresModule.setCurrentFeatures("/project", ["feature-2", "feature-3"], memfs.promises);
  
  expect(result.current_features).toEqual(["feature-2", "feature-3"]);
});