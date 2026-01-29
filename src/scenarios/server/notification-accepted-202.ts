/**
 * Streamable HTTP notification acceptance scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#sending-messages-to-the-server
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { createSessionFetch } from './helpers/session-fetch.js';

const NOTIFICATION_REQUEST = {
  jsonrpc: '2.0',
  method: 'ping'
};

const hasEmptyBody = (value: string): boolean => value.trim().length === 0;

export class ServerNotificationAccepted202Scenario implements ClientScenario {
  name = 'server-notification-accepted-202';
  description = `Test that notification POSTs return 202 Accepted with no body.

**Behavior**: If a JSON-RPC notification is accepted by the server:
- Return HTTP 202 Accepted
- Response body MUST be empty`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();
    const sessionFetch = createSessionFetch(serverUrl);

    let response: Awaited<ReturnType<typeof sessionFetch>>;

    try {
      response = await sessionFetch({
        method: 'POST',
        headers: {
          'mcp-protocol-version': '2025-11-25'
        },
        body: NOTIFICATION_REQUEST
      });
    } catch (error) {
      checks.push({
        id: 'server-notification-accepted-202',
        name: 'Notification Accepted 202',
        description: 'Notification POST returns 202 Accepted with no body',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      });
      return checks;
    }

    const isAccepted = response.status === 202;
    const isEmptyBody = hasEmptyBody(response.rawBody);

    if (!isAccepted || !isEmptyBody) {
      checks.push({
        id: 'server-notification-accepted-202',
        name: 'Notification Accepted 202',
        description: 'Notification POST returns 202 Accepted with no body',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Expected 202 with empty body, got ${response.status} and ${isEmptyBody ? 'empty' : 'non-empty'} body`,
        details: {
          status: response.status
        },
        specReferences: [
          {
            id: 'MCP-Streamable-HTTP-POST',
            url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#sending-messages-to-the-server'
          }
        ]
      });
      return checks;
    }

    checks.push({
      id: 'server-notification-accepted-202',
      name: 'Notification Accepted 202',
      description: 'Notification POST returns 202 Accepted with no body',
      status: 'SUCCESS',
      timestamp: timestamp(),
      details: {
        status: response.status
      },
      specReferences: [
        {
          id: 'MCP-Streamable-HTTP-POST',
          url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#sending-messages-to-the-server'
        }
      ]
    });

    return checks;
  }
}

