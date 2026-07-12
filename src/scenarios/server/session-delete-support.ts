/**
 * Streamable HTTP session DELETE support scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#session-management
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { authFetch } from './auth/helpers/auth-fetch.js';

const INITIALIZE_REQUEST = {
  jsonrpc: '2.0',
  id: 'init',
  method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: {
      name: 'conformance-test-client',
      version: '1.0.0'
    }
  }
};

export class ServerSessionDeleteSupportScenario implements ClientScenario {
  name = 'server-session-delete-support';
  description = `Test whether server accepts HTTP DELETE for session termination.

**Behavior**:
- Client can send HTTP DELETE to terminate a session
- HTTP 200 (supported) and HTTP 405 (not supported) are both acceptable outcomes`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();

    try {
      const initResponse = await authFetch(serverUrl, {
        method: 'POST',
        headers: {
          'mcp-protocol-version': '2025-11-25'
        },
        body: INITIALIZE_REQUEST
      });

      if (initResponse.status >= 400) {
        checks.push({
          id: 'server-session-delete-support',
          name: 'Session DELETE Support',
          description: 'Server handles HTTP DELETE for session termination',
          status: 'FAILURE',
          timestamp: timestamp(),
          errorMessage: `Initialize failed with HTTP ${initResponse.status}`,
          details: {
            status: initResponse.status
          }
        });
        return checks;
      }

      const sessionId = initResponse.headers.get('mcp-session-id') ?? undefined;
      if (!sessionId) {
        checks.push({
          id: 'server-session-delete-support',
          name: 'Session DELETE Support',
          description: 'Server handles HTTP DELETE for session termination',
          status: 'SKIPPED',
          timestamp: timestamp(),
          errorMessage:
            'Server did not return MCP-Session-Id during initialize; session termination check not applicable',
        });
        return checks;
      }

      const deleteResponse = await authFetch(serverUrl, {
        method: 'DELETE',
        headers: {
          'mcp-protocol-version': '2025-11-25',
          'mcp-session-id': sessionId
        }
      });

      const acceptable = deleteResponse.status === 200 || deleteResponse.status === 405;

      checks.push({
        id: 'server-session-delete-support',
        name: 'Session DELETE Support',
        description: 'Server handles HTTP DELETE for session termination',
        status: acceptable ? 'SUCCESS' : 'FAILURE',
        timestamp: timestamp(),
        errorMessage: acceptable
          ? undefined
          : `Expected HTTP 200 or 405 for session DELETE, got ${deleteResponse.status}`,
        details: {
          status: deleteResponse.status,
          sessionId
        }
      });
    } catch (error) {
      checks.push({
        id: 'server-session-delete-support',
        name: 'Session DELETE Support',
        description: 'Server handles HTTP DELETE for session termination',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return checks;
  }
}
