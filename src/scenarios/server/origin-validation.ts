/**
 * Streamable HTTP Origin validation scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#security-warning
 * 
 * A wrong (non-403) response is a WARNING, not a FAILURE.
 * Typically a spec MUST would be FAILURE, but in this case not all MCP servers are designed to be
 * accessed from browsers, so we allow a WARNING.
 * 
 * RFC 2606 reserves example.invalid for documentation and testing.
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { authFetch } from './auth/helpers/auth-fetch.js';

const INVALID_ORIGIN = 'https://example.invalid';

export class ServerOriginValidationScenario implements ClientScenario {
  name = 'server-origin-header-validation';
  description = `Test that server validates the Origin header for Streamable HTTP transport.

**Behavior**: When an invalid Origin header is present:
- Return HTTP 403 Forbidden
- Response body MAY be a JSON-RPC error without an id

**Test Origin**:
- ${INVALID_ORIGIN} (RFC 2606 reserved domain)`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();

    const jsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: {
          name: 'conformance-origin-test',
          version: '1.0.0'
        }
      },
      id: 1
    };

    let response: Awaited<ReturnType<typeof authFetch>>;

    try {
      response = await authFetch(serverUrl, {
        method: 'POST',
        headers: {
          Origin: INVALID_ORIGIN,
          'mcp-protocol-version': '2025-11-25'
        },
        body: jsonRpcRequest
      });
    } catch (error) {
      checks.push({
        id: 'server-origin-header-validation',
        name: 'Origin Header Validation',
        description: 'Server returns HTTP 403 Forbidden for invalid Origin header',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${error instanceof Error ? error.message : String(error)}`
      });
      return checks;
    }

    if (response.status === 403) {
      checks.push({
        id: 'server-origin-header-validation',
        name: 'Origin Header Validation',
        description: 'Server returns HTTP 403 Forbidden for invalid Origin header',
        status: 'SUCCESS',
        timestamp: timestamp(),
        details: {
          origin: INVALID_ORIGIN,
          status: response.status
        }
      });
    } else {
      checks.push({
        id: 'server-origin-header-validation',
        name: 'Origin Header Validation',
        description: 'Server returns HTTP 403 Forbidden for invalid Origin header',
        status: 'WARNING', // Typically a MUST would be FAILURE, but this doesn't apply to all servers
        timestamp: timestamp(),
        errorMessage: `Expected 403, got ${response.status}`,
        details: {
          origin: INVALID_ORIGIN,
          status: response.status
        }
      });
    }

    return checks;
  }
}

