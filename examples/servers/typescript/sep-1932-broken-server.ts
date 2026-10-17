#!/usr/bin/env node

/**
 * MCP server that does NOT enforce DPoP — NEGATIVE test fixture.
 *
 * It accepts requests without validating the DPoP proof or the access-token
 * binding at all, so it should FAIL the sep-1932-server-* negative checks
 * (proving those checks actually detect non-conformance). DO NOT use in
 * production. It is NOT what an SDK author runs against.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { handleDraftWire, isDraftWireRequest } from './sep-1932-draft-wire.js';

const SERVER_INFO = { name: 'sep-1932-broken-server', version: '1.0.0' };

const ECHO_TOOL = {
  name: 'echo',
  description: 'Echo the input back',
  inputSchema: {
    type: 'object',
    properties: { message: { type: 'string' } },
    required: ['message']
  },
  call: (args: Record<string, unknown>) => [
    { type: 'text' as const, text: `Echo: ${String(args.message ?? '')}` }
  ]
};

function createMcpServer(): McpServer {
  const server = new McpServer(SERVER_INFO);
  server.registerTool(
    ECHO_TOOL.name,
    {
      description: ECHO_TOOL.description,
      inputSchema: { message: z.string() }
    },
    async ({ message }) => ({ content: ECHO_TOOL.call({ message }) })
  );
  return server;
}

const app = express();
app.use(express.json());

// NO DPoP validation: every request is handled regardless of the (missing,
// malformed, replayed, or unbound) DPoP proof or access token.
app.post('/mcp', async (req: Request, res: Response) => {
  // Same draft-wire dispatch as the compliant fixture, still with no DPoP
  // validation, so the negative checks have a 2xx baseline to grade against.
  if (isDraftWireRequest(req)) {
    handleDraftWire(req, res, { serverInfo: SERVER_INFO, tools: [ECHO_TOOL] });
    return;
  }
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Internal error: ${error instanceof Error ? error.message : String(error)}`
        },
        id: null
      });
    }
  }
});

const PORT = parseInt(process.env.PORT || '3011', 10);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`DPoP broken server running on http://localhost:${PORT}/mcp`);
  console.log('WARNING: No DPoP validation enabled!');
});
