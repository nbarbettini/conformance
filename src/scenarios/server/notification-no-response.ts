/**
 * JSON-RPC notification response suppression scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic#notifications
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { createSessionFetch } from './helpers/session-fetch.js';
import { isRecord } from './helpers/helpers.js';

const NOTIFICATION_REQUEST = {
  jsonrpc: '2.0',
  method: 'ping'
};

const isJsonRpcResponse = (body: unknown): boolean => {
  if (!isRecord(body)) {
    return false;
  }

  return (
    'jsonrpc' in body ||
    'id' in body ||
    'result' in body ||
    'error' in body
  );
};

export class ServerNotificationNoResponseScenario implements ClientScenario {
  name = 'server-notification-no-response';
  description = `Test that servers do not return JSON-RPC responses to notifications.

**Behavior**: For JSON-RPC notifications:
- The receiver MUST NOT send a JSON-RPC response`;

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
        id: 'server-notification-no-response',
        name: 'Notification No Response',
        description: 'Server does not return JSON-RPC responses to notifications',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      });
      return checks;
    }

    if (isJsonRpcResponse(response.body)) {
      checks.push({
        id: 'server-notification-no-response',
        name: 'Notification No Response',
        description: 'Server does not return JSON-RPC responses to notifications',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: 'Expected no JSON-RPC response to notification',
        details: {
          status: response.status
        },
        specReferences: [
          {
            id: 'MCP-Notifications',
            url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic#notifications'
          }
        ]
      });
      return checks;
    }

    checks.push({
      id: 'server-notification-no-response',
      name: 'Notification No Response',
      description: 'Server does not return JSON-RPC responses to notifications',
      status: 'SUCCESS',
      timestamp: timestamp(),
      details: {
        status: response.status
      },
      specReferences: [
        {
          id: 'MCP-Notifications',
          url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic#notifications'
        }
      ]
    });

    return checks;
  }
}

