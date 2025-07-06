import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { MCPServer } from '@mastra/mcp';

import { tddPlanningWorkflow } from '@/workflows/tdd-workflow';
import { featureTools } from '@/tools/feature-tools';
import { taskTools } from '@/tools/task-tools';

const tddproServer = new MCPServer({
  name: 'TDD-Pro MCP Server',
  version: '1.0.0',
  agents: { },
  tools: { ...featureTools, ...taskTools },
});

export const mastra = new Mastra({
  mcpServers: { tddpro: tddproServer },
  workflows: {
    tddPlanning: tddPlanningWorkflow,
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
