import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";

export async function findTddProRoot(startDir: string, fsMod = fs): Promise<{ success: true; root: string } | { success: false; error: string }> {
  let currentDir = path.resolve(startDir);
  const rootDir = path.parse(currentDir).root;
  const homeDir = process.env.HOME || process.env.USERPROFILE; // cross-platform
  let foundHomeTddPro: string | null = null;
  
  while (currentDir !== rootDir) {
    try {
      const tddProPath = path.join(currentDir, '.tdd-pro');
      await fsMod.stat(tddProPath);
      // If this is $HOME/.tdd-pro, remember it but keep searching up
      if (homeDir && path.resolve(currentDir) === path.resolve(homeDir)) {
        foundHomeTddPro = currentDir;
      } else {
        // Found a project-local .tdd-pro directory
        return { success: true, root: currentDir };
      }
    } catch (e) {
      // .tdd-pro doesn't exist, go up one level
    }
    currentDir = path.dirname(currentDir);
  }
  
  // Check root directory too
  try {
    const tddProPath = path.join(currentDir, '.tdd-pro');
    await fsMod.stat(tddProPath);
    if (homeDir && path.resolve(currentDir) === path.resolve(homeDir)) {
      foundHomeTddPro = currentDir;
    } else {
      return { success: true, root: currentDir };
    }
  } catch (e) {
    // Not found anywhere
  }
  
  // If we found $HOME/.tdd-pro but nothing else, return it as a fallback
  if (foundHomeTddPro) {
    return { success: true, root: foundHomeTddPro };
  }
  
  return {
    success: false,
    error: "No .tdd-pro directory found. Please run 'tdd-pro init' in your project root to initialize TDD-Pro tracking."
  };
}

interface FeatureItem {
  id: string;
  name: string;
  description: string;
}

interface FeaturesData {
  approved: FeatureItem[];
  planned: FeatureItem[];
  refinement: FeatureItem[];
  backlog: FeatureItem[];
  current_features?: string[];  // Changed from single current_feature to array
}

export async function createFeature(cwd: string, featureId: string, name: string, description: string, status: "refinement" | "backlog" = "refinement", fsMod: any = fs) {
  if (!name.trim()) {
    throw new Error("Feature name is required");
  }
  if (!description.trim() || description.length < 50) {
    throw new Error("Feature description must be at least 50 characters (2-3 paragraphs)");
  }
  
  // Find .tdd-pro directory
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) {
    throw new Error(rootResult.error);
  }
  
  const indexPath = path.join(rootResult.root, ".tdd-pro", "features", "index.yml");
  let data: any = { approved: [], planned: [], refinement: [], backlog: [] };
  try {
    const file = await fsMod.readFile(indexPath, "utf8");
    const loaded = yaml.load(file);
    if (typeof loaded === 'object' && loaded !== null) {
      data = loaded;
    }
  } catch (e) {
    // If file doesn't exist, start with empty
  }
  
  // Ensure arrays exist and convert old string format to FeatureItem format
  if (!Array.isArray(data.approved)) data.approved = [];
  if (!Array.isArray(data.planned)) data.planned = [];
  if (!Array.isArray(data.refinement)) data.refinement = [];
  if (!Array.isArray(data.backlog)) data.backlog = [];
  
  // Convert old string arrays to FeatureItem arrays if needed
  data.approved = data.approved.map((item: any) =>
    typeof item === 'string' ? { id: item, name: item, description: '' } : item
  );
  data.planned = data.planned.map((item: any) =>
    typeof item === 'string' ? { id: item, name: item, description: '' } : item
  );
  
  const featureItem: FeatureItem = { id: featureId, name, description };
  
  if (status === "backlog") {
    data.backlog.push(featureItem);
  } else {
    data.refinement.push(featureItem);
  }
  
  await fsMod.mkdir(path.dirname(indexPath), { recursive: true });
  await fsMod.writeFile(indexPath, yaml.dump(data), "utf8");
  
  // Auto-create feature directory with prd.md and tasks.yml
  const featureDir = path.join(rootResult.root, ".tdd-pro", "features", featureId);
  await fsMod.mkdir(featureDir, { recursive: true });
  
  // Create default prd.md
  const prdPath = path.join(featureDir, "prd.md");
  const defaultPrdContent = `# ${name}

## Feature Brief

${description}

## Acceptance Criteria

- [ ] [Add specific, testable criteria here]
- [ ] [Each criteria should be clear and measurable]

## Design Discussion

[Add technical design notes, architecture considerations, and implementation details]

## Notes

[Any additional notes, considerations, or links]
`;
  
  try {
    await fsMod.stat(prdPath);
    // File exists, don't overwrite
  } catch {
    // File doesn't exist, create it
    await fsMod.writeFile(prdPath, defaultPrdContent, "utf8");
  }
  
  // Create default tasks.yml
  const tasksPath = path.join(featureDir, "tasks.yml");
  const defaultTasks: any[] = [];
  
  try {
    await fsMod.stat(tasksPath);
    // File exists, don't overwrite
  } catch {
    // File doesn't exist, create it
    await fsMod.writeFile(tasksPath, yaml.dump(defaultTasks), "utf8");
  }
  
  return data as FeaturesData;
}

export async function deleteFeature(cwd: string, feature: string, fsMod: any = fs) {
  // Find .tdd-pro directory
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) {
    throw new Error(rootResult.error);
  }
  
  const indexPath = path.join(rootResult.root, ".tdd-pro", "features", "index.yml");
  let data: any = { approved: [], planned: [], refinement: [], backlog: [] };
  try {
    const file = await fsMod.readFile(indexPath, "utf8");
    const loaded = yaml.load(file);
    if (typeof loaded === 'object' && loaded !== null) {
      data = loaded;
    }
  } catch (e) {
    // If file doesn't exist, nothing to delete
    return data as FeaturesData;
  }
  
  // Ensure arrays exist
  if (!Array.isArray(data.approved)) data.approved = [];
  if (!Array.isArray(data.planned)) data.planned = [];
  if (!Array.isArray(data.refinement)) data.refinement = [];
  if (!Array.isArray(data.backlog)) data.backlog = [];
  
  // Convert old string arrays to FeatureItem arrays if needed
  data.approved = data.approved.map((item: any) =>
    typeof item === 'string' ? { id: item, name: item, description: '' } : item
  );
  data.planned = data.planned.map((item: any) =>
    typeof item === 'string' ? { id: item, name: item, description: '' } : item
  );
  
  // Remove from all arrays
  data.approved = data.approved.filter((item: FeatureItem) => item.id !== feature);
  data.planned = data.planned.filter((item: FeatureItem) => item.id !== feature);
  data.refinement = data.refinement.filter((item: FeatureItem) => item.id !== feature);
  data.backlog = data.backlog.filter((item: FeatureItem) => item.id !== feature);
  
  await fsMod.writeFile(indexPath, yaml.dump(data), "utf8");
  return data as FeaturesData;
}

export async function migrateFeatures(cwd: string, fsMod: any = fs) {
  // Find .tdd-pro directory
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) {
    throw new Error(rootResult.error);
  }
  
  const indexPath = path.join(rootResult.root, ".tdd-pro", "features", "index.yml");
  try {
    const file = await fsMod.readFile(indexPath, "utf8");
    let data: any = yaml.load(file);
    if (typeof data !== 'object' || data === null) {
      data = { approved: [], planned: [], refinement: [], backlog: [] };
    }
    if (!Array.isArray(data.approved)) data.approved = [];
    if (!Array.isArray(data.planned)) data.planned = [];
    if (!Array.isArray(data.refinement)) data.refinement = [];
    if (!Array.isArray(data.backlog)) data.backlog = [];
    
    let needsMigration = false;
    
    // Check if migration is needed and convert old format
    if (typeof data.features === 'object' && data.features !== null) {
      data.approved = data.features.approved || [];
      data.planned = data.features.planned || [];
      data.refinement = data.features.refinement || [];
      data.backlog = data.features.backlog || [];
      delete data.features;
      needsMigration = true;
    }
    
    // Convert string arrays to FeatureItem arrays if needed
    if (Array.isArray(data.approved) && data.approved.some((item: any) => typeof item === 'string')) {
      data.approved = data.approved.map((item: any) =>
        typeof item === 'string' ? { id: item, name: item.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), description: '' } : item
      );
      needsMigration = true;
    }
    
    if (Array.isArray(data.planned) && data.planned.some((item: any) => typeof item === 'string')) {
      data.planned = data.planned.map((item: any) =>
        typeof item === 'string' ? { id: item, name: item.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), description: '' } : item
      );
      needsMigration = true;
    }
    
    if (Array.isArray(data.backlog) && data.backlog.some((item: any) => typeof item === 'string')) {
      data.backlog = data.backlog.map((item: any) =>
        typeof item === 'string' ? { id: item, name: item.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), description: '' } : item
      );
      needsMigration = true;
    }
    
    // Migrate single current_feature to current_features array
    if (data.current_feature && typeof data.current_feature === 'string') {
      data.current_features = [data.current_feature];
      delete data.current_feature;
      needsMigration = true;
    }
    
    // Ensure current_features is an array if it exists
    if (data.current_features && !Array.isArray(data.current_features)) {
      data.current_features = [];
      needsMigration = true;
    }
    
    // Save migrated format if needed
    if (needsMigration) {
      await fsMod.mkdir(path.dirname(indexPath), { recursive: true });
      await fsMod.writeFile(indexPath, yaml.dump(data), "utf8");
      console.log(`Migrated features file: ${indexPath}`);
    }
    
    return data as FeaturesData;
  } catch (e) {
    // Return empty structure if file doesn't exist
    return { approved: [], planned: [], refinement: [], backlog: [] };
  }
}

export async function getFeatures(cwd: string, fsMod: any = fs) {
  const data = await migrateFeatures(cwd, fsMod);
  if (
    typeof data === 'object' && data !== null &&
    Array.isArray((data as any).approved) &&
    Array.isArray((data as any).planned) &&
    Array.isArray((data as any).refinement) &&
    Array.isArray((data as any).backlog)
  ) {
    return data as FeaturesData;
  }
  return { approved: [], planned: [], refinement: [], backlog: [] };
}

export async function updateFeature(
  cwd: string, 
  featureId: string, 
  updates: { id?: string; name?: string; description?: string }, 
  fsMod: any = fs
) {
  // Find .tdd-pro directory
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) {
    throw new Error(rootResult.error);
  }
  
  const indexPath = path.join(rootResult.root, ".tdd-pro", "features", "index.yml");
  let data: FeaturesData = { approved: [], planned: [], refinement: [], backlog: [] };
  try {
    const file = await fsMod.readFile(indexPath, "utf8");
    let loaded: any = yaml.load(file);
    if (typeof loaded !== 'object' || loaded === null) {
      loaded = { approved: [], planned: [], refinement: [], backlog: [] };
    }
    if (!Array.isArray(loaded.approved)) loaded.approved = [];
    if (!Array.isArray(loaded.planned)) loaded.planned = [];
    if (!Array.isArray(loaded.refinement)) loaded.refinement = [];
    if (!Array.isArray(loaded.backlog)) loaded.backlog = [];
    data = loaded as FeaturesData;
  } catch (e) {
    throw new Error("Features index not found");
  }
  
  // Ensure arrays exist and convert old format
  if (!Array.isArray(data.approved)) data.approved = [];
  if (!Array.isArray(data.planned)) data.planned = [];
  if (!Array.isArray(data.refinement)) data.refinement = [];
  if (!Array.isArray(data.backlog)) data.backlog = [];
  
  data.approved = data.approved.map(item => 
    typeof item === 'string' ? { id: item, name: item, description: '' } : item
  );
  data.planned = data.planned.map(item => 
    typeof item === 'string' ? { id: item, name: item, description: '' } : item
  );
  
  // Find and update the feature
  let found = false;
  const updateInArray = (items: FeatureItem[]) => {
    return items.map(item => {
      if (item.id === featureId) {
        found = true;
        return {
          id: updates.id || item.id,
          name: updates.name || item.name,
          description: updates.description || item.description
        };
      }
      return item;
    });
  };
  
  data.approved = updateInArray(data.approved);
  data.planned = updateInArray(data.planned);
  data.refinement = updateInArray(data.refinement);
  data.backlog = updateInArray(data.backlog);
  
  if (!found) {
    throw new Error(`Feature '${featureId}' not found`);
  }
  
  // If ID changed, rename the feature folder if it exists
  if (updates.id && updates.id !== featureId) {
    const oldFolderPath = path.join(rootResult.root, ".tdd-pro", "features", featureId);
    const newFolderPath = path.join(rootResult.root, ".tdd-pro", "features", updates.id);
    try {
      await fsMod.stat(oldFolderPath);
      await fsMod.rename(oldFolderPath, newFolderPath);
    } catch (e) {
      // Folder doesn't exist yet, that's fine
    }
  }
  
  await fsMod.mkdir(path.dirname(indexPath), { recursive: true });
  await fsMod.writeFile(indexPath, yaml.dump(data), "utf8");
  return data;
}

export async function promoteFeature(cwd: string, feature: string, fromStatus: "refinement" | "planned", toStatus: "planned" | "approved", fsMod: any = fs) {
  // Find .tdd-pro directory
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) {
    throw new Error(rootResult.error);
  }
  
  const indexPath = path.join(rootResult.root, ".tdd-pro", "features", "index.yml");
  let data: any = { approved: [], planned: [], refinement: [], backlog: [] };
  try {
    const file = await fsMod.readFile(indexPath, "utf8");
    const loaded = yaml.load(file);
    if (typeof loaded === 'object' && loaded !== null) {
      data = loaded;
    }
  } catch (e) {
    // If file doesn't exist, start with empty
  }
  
  // Ensure arrays exist and convert old format
  if (!Array.isArray(data.approved)) data.approved = [];
  if (!Array.isArray(data.planned)) data.planned = [];
  if (!Array.isArray(data.refinement)) data.refinement = [];
  if (!Array.isArray(data.backlog)) data.backlog = [];
  
  data.approved = data.approved.map((item: any) =>
    typeof item === 'string' ? { id: item, name: item, description: '' } : item
  );
  data.planned = data.planned.map((item: any) =>
    typeof item === 'string' ? { id: item, name: item, description: '' } : item
  );
  
  // Move feature between statuses
  if (fromStatus === "refinement" && toStatus === "planned") {
    const refinementItem = data.refinement.find((item: FeatureItem) => item.id === feature);
    if (refinementItem) {
      data.refinement = data.refinement.filter((item: FeatureItem) => item.id !== feature);
      data.planned.push(refinementItem);
    }
  } else if (fromStatus === "planned" && toStatus === "approved") {
    const plannedItem = data.planned.find((item: FeatureItem) => item.id === feature);
    if (plannedItem) {
      data.planned = data.planned.filter((item: FeatureItem) => item.id !== feature);
      data.approved.push(plannedItem);
    }
  }
  
  await fsMod.mkdir(path.dirname(indexPath), { recursive: true });
  await fsMod.writeFile(indexPath, yaml.dump(data), "utf8");
  return data as FeaturesData;
}

/**
 * Get all details for a specific feature, including index.yml, prd.md, and tasks.yml.
 * @param cwd Project root or subdirectory
 * @param featureId Feature ID (kebab-case)
 * @param fsMod Optional fs/promises module for testing
 */
export async function getFeature(cwd: string, featureId: string, fsMod: any = fs) {
  // Find .tdd-pro root
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) throw new Error(rootResult.error);
  const featureDir = path.join(rootResult.root, ".tdd-pro", "features", featureId);
  // Read index.yml
  let index = {
    id: featureId,
    name: '',
    description: '',
    status: '',
    owner: '',
    created: '',
    updated: '',
    tags: [],
    related_docs: [],
    dependencies: []
  };
  try {
    const indexFile = await fsMod.readFile(path.join(featureDir, "index.yml"), "utf8");
    const loaded = yaml.load(indexFile) || {};
    index = { ...index, ...loaded };
  } catch {}
  // Read prd.md
  let prd = "";
  try {
    prd = await fsMod.readFile(path.join(featureDir, "prd.md"), "utf8");
  } catch {}
  // Read tasks.yml
  let tasks = [];
  try {
    const tasksFile = await fsMod.readFile(path.join(featureDir, "tasks.yml"), "utf8");
    const loadedTasks = yaml.load(tasksFile);
    tasks = Array.isArray(loadedTasks) ? loadedTasks : [];
  } catch {}
  return { index, prd, tasks };
}

/**
 * Update the prd.md for a feature with a markdown document.
 * @param cwd Project root or subdirectory
 * @param featureId Feature ID (kebab-case)
 * @param markdown Markdown content to write
 * @param fsMod Optional fs/promises module for testing
 */
export async function refineFeature(cwd: string, featureId: string, markdown: string, fsMod: any = fs) {
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) throw new Error(rootResult.error);
  const prdPath = path.join(rootResult.root, ".tdd-pro", "features", featureId, "prd.md");
  await fsMod.mkdir(path.dirname(prdPath), { recursive: true });
  await fsMod.writeFile(prdPath, markdown, "utf8");
  return { success: true };
}


/**
 * Archive a feature: move its folder to .tdd-pro/archived-features and remove from index.
 * @param cwd Project root or subdirectory
 * @param featureId Feature ID (kebab-case)
 * @param fsMod Optional fs/promises module for testing
 */
export async function archiveFeature(cwd: string, featureId: string, fsMod: any = fs) {
  // Find .tdd-pro root
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) throw new Error(rootResult.error);
  const tddProDir = path.join(rootResult.root, ".tdd-pro");
  const featuresDir = path.join(tddProDir, "features");
  const archivedDir = path.join(tddProDir, "archived-features");
  const featureFolder = path.join(featuresDir, featureId);
  const archivedFolder = path.join(archivedDir, featureId);
  const indexPath = path.join(featuresDir, "index.yml");

  // Remove from index
  let data: any = { approved: [], planned: [], refinement: [], backlog: [] };
  try {
    const file = await fsMod.readFile(indexPath, "utf8");
    const loaded = yaml.load(file);
    if (typeof loaded === 'object' && loaded !== null) {
      data = loaded;
    }
  } catch (e) {
    throw new Error("Features index not found");
  }
  // Remove from all arrays
  let found = false;
  for (const key of ["approved", "planned", "refinement", "backlog"]) {
    if (Array.isArray(data[key])) {
      const before = data[key].length;
      data[key] = data[key].filter((item: any) => item.id !== featureId);
      if (data[key].length < before) found = true;
    }
  }
  if (!found) throw new Error(`Feature '${featureId}' not found in index`);
  await fsMod.writeFile(indexPath, yaml.dump(data), "utf8");

  // Move feature folder
  try {
    await fsMod.mkdir(archivedDir, { recursive: true });
    await fsMod.rename(featureFolder, archivedFolder);
  } catch (e) {
    throw new Error(`Failed to archive feature folder: ${e}`);
  }
  return { success: true, data };
}

/**
 * Get the PRD markdown document for a feature
 */
export async function getFeatureDocument(cwd: string, featureId: string, fsMod = fs): Promise<string> {
  const tddProResult = await findTddProRoot(cwd, fsMod);
  if (!tddProResult.success) {
    throw new Error(tddProResult.error);
  }

  const prdPath = path.join(tddProResult.root, '.tdd-pro', 'features', featureId, 'prd.md');
  
  try {
    const content = await fsMod.readFile(prdPath, 'utf8');
    return content;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      // If PRD doesn't exist, create an empty one
      const defaultContent = `# ${featureId}

## Feature Brief

[Provide a brief description of what this feature does and why it's needed]

## Acceptance Criteria

- [ ] [Add specific, testable criteria here]
- [ ] [Each criteria should be clear and measurable]

## Design Discussion

[Add technical design notes, architecture considerations, and implementation details]

## Notes

[Any additional notes, considerations, or links]
`;
      
      // Ensure the feature directory exists
      const featureDir = path.dirname(prdPath);
      await fsMod.mkdir(featureDir, { recursive: true });
      
      // Create the empty PRD
      await fsMod.writeFile(prdPath, defaultContent, 'utf8');
      return defaultContent;
    }
    throw error;
  }
}

/**
 * Update the PRD markdown document for a feature
 */
export async function updateFeatureDocument(cwd: string, featureId: string, content: string, fsMod = fs): Promise<void> {
  const tddProResult = await findTddProRoot(cwd, fsMod);
  if (!tddProResult.success) {
    throw new Error(tddProResult.error);
  }

  const prdPath = path.join(tddProResult.root, '.tdd-pro', 'features', featureId, 'prd.md');
  
  // Ensure the feature directory exists
  const featureDir = path.dirname(prdPath);
  await fsMod.mkdir(featureDir, { recursive: true });
  
  // Write the content
  await fsMod.writeFile(prdPath, content, 'utf8');
}

/**
 * Add a feature to the current features list
 */
export async function addCurrentFeature(cwd: string, featureId: string, fsMod = fs): Promise<FeaturesData> {
  const data = await migrateFeatures(cwd, fsMod);
  
  // Initialize current_features if it doesn't exist
  if (!data.current_features) {
    data.current_features = [];
  }
  
  // Add the feature if it's not already current
  if (!data.current_features.includes(featureId)) {
    data.current_features.push(featureId);
  }
  
  // Save the updated data
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) {
    throw new Error(rootResult.error);
  }
  
  const indexPath = path.join(rootResult.root, ".tdd-pro", "features", "index.yml");
  await fsMod.mkdir(path.dirname(indexPath), { recursive: true });
  await fsMod.writeFile(indexPath, yaml.dump(data), "utf8");
  
  return data;
}

/**
 * Remove a feature from the current features list
 */
export async function removeCurrentFeature(cwd: string, featureId: string, fsMod = fs): Promise<FeaturesData> {
  const data = await migrateFeatures(cwd, fsMod);
  
  // Initialize current_features if it doesn't exist
  if (!data.current_features) {
    data.current_features = [];
  }
  
  // Remove the feature from current list
  data.current_features = data.current_features.filter(id => id !== featureId);
  
  // Save the updated data
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) {
    throw new Error(rootResult.error);
  }
  
  const indexPath = path.join(rootResult.root, ".tdd-pro", "features", "index.yml");
  await fsMod.mkdir(path.dirname(indexPath), { recursive: true });
  await fsMod.writeFile(indexPath, yaml.dump(data), "utf8");
  
  return data;
}

/**
 * Set the current features list (replaces all current features)
 */
export async function setCurrentFeatures(cwd: string, featureIds: string[], fsMod = fs): Promise<FeaturesData> {
  const data = await migrateFeatures(cwd, fsMod);
  
  // Set the current features
  data.current_features = [...featureIds];
  
  // Save the updated data
  const rootResult = await findTddProRoot(cwd, fsMod);
  if (!rootResult.success) {
    throw new Error(rootResult.error);
  }
  
  const indexPath = path.join(rootResult.root, ".tdd-pro", "features", "index.yml");
  await fsMod.mkdir(path.dirname(indexPath), { recursive: true });
  await fsMod.writeFile(indexPath, yaml.dump(data), "utf8");
  
  return data;
}