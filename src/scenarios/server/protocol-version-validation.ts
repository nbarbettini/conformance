/**
 * Streamable HTTP protocol version validation scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#protocol-version-header
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { createSessionFetch } from './helpers/session-fetch.js';

const INVALID_PROTOCOL_VERSION = 'invalid-version';

export class ServerProtocolVersionValidationScenario implements ClientScenario {
  name = 'server-protocol-version-header-validation';
  description = `Test that server rejects invalid MCP-Protocol-Version headers.

**Behavior**: When an invalid MCP-Protocol-Version is present:
- Return HTTP 400 Bad Request
- Response body MAY be a JSON-RPC error without an id`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();

    const jsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'ping',
      id: 1
    };

    const sessionFetch = createSessionFetch(serverUrl);
    let response: Awaited<ReturnType<typeof sessionFetch>>;

    try {
      response = await sessionFetch({
        method: 'POST',
        headers: {
          'mcp-protocol-version': INVALID_PROTOCOL_VERSION
        },
        body: jsonRpcRequest
      });
    } catch (error) {
      checks.push({
        id: 'server-protocol-version-header-validation',
        name: 'Protocol Version Header Validation',
        description: 'Server returns 400 Bad Request for invalid protocol version in header',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${error instanceof Error ? error.message : String(error)}`
      });
      return checks;
    }

    if (response.status === 400) {
      checks.push({
        id: 'server-protocol-version-header-validation',
        name: 'Protocol Version Header Validation',
        description: 'Server returns 400 Bad Request for invalid protocol version in header',
        status: 'SUCCESS',
        timestamp: timestamp(),
        details: {
          status: response.status
        }
      });
    } else {
      checks.push({
        id: 'server-protocol-version-header-validation',
        name: 'Protocol Version Header Validation',
        description: 'Server returns 400 Bad Request for invalid protocol version in header',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Expected 400, got ${response.status}`,
        details: {
          status: response.status
        }
      });
    }

    return checks;
  }
}

