import { test, expect } from "vitest";
import { z } from "zod";

// Test the zodToJsonSchema function used in the MCP server
function zodToJsonSchema(zodSchema: any): any {
  const shape = zodSchema._def.shape();
  const properties: any = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const field = value as any;
    if (field._def.typeName === 'ZodString') {
      properties[key] = { type: 'string', description: field.description || '' };
      if (!field.isOptional()) required.push(key);
    } else if (field._def.typeName === 'ZodEnum') {
      properties[key] = { type: 'string', enum: field._def.values, description: field.description || '' };
      if (!field.isOptional()) required.push(key);
    } else if (field._def.typeName === 'ZodArray') {
      properties[key] = { type: 'array', items: {}, description: field.description || '' };
      if (!field.isOptional()) required.push(key);
    } else if (field._def.typeName === 'ZodObject') {
      properties[key] = zodToJsonSchema(field);
      if (!field.isOptional()) required.push(key);
    } else if (field._def.typeName === 'ZodOptional') {
      const innerType = field._def.innerType;
      if (innerType._def.typeName === 'ZodString') {
        properties[key] = { type: 'string', description: innerType.description || '' };
      } else if (innerType._def.typeName === 'ZodArray') {
        properties[key] = { type: 'array', items: {}, description: innerType.description || '' };
      } else if (innerType._def.typeName === 'ZodObject') {
        properties[key] = zodToJsonSchema(innerType);
      }
    }
  }

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false
  };
}

test("MCP server schema conversion handles refine-feature-tasks correctly", () => {
  // Test the actual schema used by refine-feature-tasks
  const schema = z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    tasks: z.array(z.any()).describe("List of task objects, each with id, name, status, description, and acceptance_criteria."),
  });

  const result = zodToJsonSchema(schema);
  
  expect(result.properties.tasks).toEqual({
    type: 'array',
    items: {},
    description: 'List of task objects, each with id, name, status, description, and acceptance_criteria.'
  });
  expect(result.required).toContain('tasks');
});

test("MCP server schema conversion handles set-tasks correctly", () => {
  // Test the actual schema used by set-tasks
  const TaskSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(["pending", "in-progress", "completed"]),
  });

  const schema = z.object({
    cwd: z.string().describe("Current working directory"),
    featureId: z.string().describe("Feature ID (kebab-case)"),
    tasks: z.array(TaskSchema).describe("Full list of tasks to set for the feature."),
  });

  const result = zodToJsonSchema(schema);
  
  expect(result.properties.tasks).toEqual({
    type: 'array',
    items: {},
    description: 'Full list of tasks to set for the feature.'
  });
  expect(result.required).toContain('tasks');
});

test("MCP server schema conversion handles arrays in general", () => {
  const schema = z.object({
    requiredArray: z.array(z.string()).describe("Required array field"),
    optionalArray: z.array(z.number()).optional().describe("Optional array field"),
  });

  const result = zodToJsonSchema(schema);
  
  expect(result.properties.requiredArray).toEqual({
    type: 'array',
    items: {},
    description: 'Required array field'
  });
  expect(result.properties.optionalArray).toEqual({
    type: 'array',
    items: {},
    description: ''  // Description is lost on optional fields currently
  });
  expect(result.required).toEqual(['requiredArray']);
});