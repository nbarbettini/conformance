/**
 * Streamable HTTP session ID visible ASCII validation scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#session-management
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { authFetch } from './auth/helpers/auth-fetch.js';

const VISIBLE_ASCII_REGEX = /^[\x21-\x7E]+$/;

export class ServerSessionIdAsciiScenario implements ClientScenario {
  name = 'server-session-id-visible-ascii';
  description = `Test that MCP-Session-Id header contains only visible ASCII characters.

**Behavior**: If a server assigns a session ID at initialization:
- It MUST only contain visible ASCII characters (0x21 to 0x7E)`;

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
          name: 'conformance-session-id-test',
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
          'mcp-protocol-version': '2025-11-25'
        },
        body: jsonRpcRequest
      });
    } catch (error) {
      checks.push({
        id: 'server-session-id-visible-ascii',
        name: 'Server Session ID Validation',
        description: 'Server returns a session ID containing only visible ASCII characters',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${error instanceof Error ? error.message : String(error)}`
      });
      return checks;
    }

    if (response.status >= 400) {
      checks.push({
        id: 'server-session-id-visible-ascii',
        name: 'Server Session ID Validation',
        description: 'Server returns a session ID containing only visible ASCII characters',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Expected success status, got ${response.status}`,
        details: {
          status: response.status
        }
      });
      return checks;
    }

    const sessionId =
      response.headers.get('mcp-session-id');

    if (!sessionId) {
      checks.push({
        id: 'server-session-id-visible-ascii',
        name: 'Server Session ID Validation',
        description:
          'Server-provided session ID uses only visible ASCII characters',
        status: 'INFO',
        timestamp: timestamp(),
        details: {
          message:
            'Server did not provide the MCP-Session-Id header (session ID is optional)'
        }
      });
      return checks;
    }

    if (VISIBLE_ASCII_REGEX.test(sessionId)) {
      checks.push({
        id: 'server-session-id-visible-ascii',
        name: 'Server Session ID Validation',
        description:
          'Server-provided session ID uses only visible ASCII characters',
        status: 'SUCCESS',
        timestamp: timestamp(),
        details: {
          sessionId
        }
      });
    } else {
      checks.push({
        id: 'server-session-id-visible-ascii',
        name: 'Server Session ID Validation',
        description:
          'Server-provided session ID uses only visible ASCII characters',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage:
          'Session ID contains characters outside visible ASCII (0x21-0x7E)',
        details: {
          sessionId
        }
      });
    }

    return checks;
  }
}

