/**
 * Streamable HTTP invalid JSON-RPC input handling scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#sending-messages-to-the-server
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { authFetch } from './auth/helpers/auth-fetch.js';

const INVALID_JSONRPC_RESPONSE = {
  jsonrpc: '2.0',
  result: { ok: true },
  id: 1
};

export class ServerInvalidJsonRpcInputScenario implements ClientScenario {
  name = 'server-jsonrpc-request-validation';
  description = `Test that server rejects JSON-RPC response inputs for Streamable HTTP transport.

**Behavior**: When a JSON-RPC response is sent to the server:
- If the server cannot accept the input, it MUST return an HTTP error status code (e.g., 400)
- Response body MAY be a JSON-RPC error without an id`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();

    let response: Awaited<ReturnType<typeof authFetch>>;

    try {
      response = await authFetch(serverUrl, {
        method: 'POST',
        headers: {
          'mcp-protocol-version': '2025-11-25'
        },
        body: INVALID_JSONRPC_RESPONSE
      });
    } catch (error) {
      checks.push({
        id: 'server-jsonrpc-request-validation',
        name: 'JSON-RPC Request Validation',
        description: 'Server returns HTTP 400 Bad Request for invalid JSON-RPC request',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${error instanceof Error ? error.message : String(error)}`
      });
      return checks;
    }

    if (response.status >= 400) {
      checks.push({
        id: 'server-jsonrpc-request-validation',
        name: 'JSON-RPC Request Validation',
        description: 'Server returns HTTP 400 Bad Request for invalid JSON-RPC request',
        status: 'SUCCESS',
        timestamp: timestamp(),
        details: {
          status: response.status
        }
      });
    } else {
      checks.push({
        id: 'server-jsonrpc-request-validation',
        name: 'JSON-RPC Request Validation',
        description: 'Server returns HTTP 400 Bad Request for invalid JSON-RPC request',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Expected HTTP error status, got ${response.status}`,
        details: {
          status: response.status
        }
      });
    }

    return checks;
  }
}

