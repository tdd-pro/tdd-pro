import { createServer, IncomingMessage, ServerResponse } from 'http';
import { MCPServer } from '@mastra/mcp';
import { tddAgent } from './agents/coordinator';
import { tddProTools } from './tools/tdd-tools';

// Create the MCPServer and register your agent and tools
const server = new MCPServer({
  name: 'TDD-Pro MCP Server',
  version: '1.0.0',
  agents: { tddAgent },
  tools: tddProTools,
});

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);

  if (url.pathname === '/sse' || url.pathname === '/message') {
    // Native Mastra SSE support for both /sse and /message
    await server.startSSE({
      url,
      ssePath: '/sse',
      messagePath: '/message',
      req,
      res,
    });
  } else if (url.pathname === '/history') {
    // Placeholder for chat history endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
  } else {
    res.writeHead(404);
    res.end();
  }
});

httpServer.listen(8080, () => {
  console.log('TDD-Pro MCP backend running at http://localhost:8080');
});
