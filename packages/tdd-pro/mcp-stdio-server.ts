#!/usr/bin/env bun
/**
 * TDD-Pro MCP Server for Claude Code (stdio transport)
 * 
 * This creates a standalone MCP server that communicates via stdin/stdout
 * which is what Claude Code expects for subprocess-based MCP servers.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { featureTools } from './src/mastra/tools/feature-tools.js';
import { taskTools } from './src/mastra/tools/task-tools.js';

// Feature tools from the main application

// Create MCP server
const server = new Server(
  {
    name: 'TDD-Pro MCP Server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const availableTools = { ...featureTools, ...taskTools };

// Convert Mastra tools to MCP format
function zodToJsonSchema(zodSchema: any): any {
  // This is a simplified conversion - for production you'd want a proper library
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

// Convert tools to MCP format
const mcpTools = Object.entries(availableTools).map(([id, tool]) => ({
  name: tool.id,
  description: tool.description,
  inputSchema: zodToJsonSchema(tool.inputSchema),
}));

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: mcpTools,
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const tool = Object.values(availableTools).find(t => t.id === name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    // Validate and parse input according to schema
    let validatedArgs;
    try {
      validatedArgs = tool.inputSchema.parse(args);
    } catch (validationError) {
      throw new Error(`Invalid input for tool ${name}: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
    }

    // Execute the tool with validated arguments
    const result = await tool.execute({
      context: validatedArgs,
    });

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start stdio server
async function main() {
  try {
    console.error('Starting TDD-Pro MCP Server...');
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('TDD-Pro MCP Server ready for Claude Code');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle process cleanup
process.on('SIGINT', () => {
  console.error('Shutting down TDD-Pro MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down TDD-Pro MCP Server...');
  process.exit(0);
});

main();