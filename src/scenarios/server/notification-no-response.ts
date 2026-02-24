/**
 * Notifications MUST NOT receive JSON-RPC responses.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic#notifications
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { createSessionFetch } from './helpers/session-fetch.js';

const NOTIFICATION_REQUEST = {
  jsonrpc: '2.0',
  method: 'notifications/initialized',
  params: {}
};

type JsonRpcEnvelope = {
  jsonrpc?: unknown;
  id?: unknown;
  result?: unknown;
  error?: unknown;
};

function isJsonRpcResponseEnvelope(value: unknown): value is JsonRpcEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as JsonRpcEnvelope;
  if (candidate.jsonrpc !== '2.0') {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(candidate, 'id') ||
    Object.prototype.hasOwnProperty.call(candidate, 'result') ||
    Object.prototype.hasOwnProperty.call(candidate, 'error')
  );
}

export class ServerNotificationNoResponseScenario implements ClientScenario {
  name = 'server-notification-no-response';
  description = `Test that server does not send JSON-RPC responses to notifications.

**Behavior**:
- Notification requests (without id) MUST NOT receive JSON-RPC result/error responses
- For accepted notifications, servers typically return HTTP 202 with no body`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();
    const sessionFetch = createSessionFetch(serverUrl, {
      headers: {
        'mcp-protocol-version': '2025-11-25'
      }
    });

    try {
      const response = await sessionFetch({
        method: 'POST',
        body: NOTIFICATION_REQUEST
      });

      const trimmedBody = response.rawBody.trim();
      const hasBody = trimmedBody.length > 0;

      if (isJsonRpcResponseEnvelope(response.body)) {
        checks.push({
          id: 'server-notification-no-response',
          name: 'Server Notification Response Behavior',
          description: 'Server does not return JSON-RPC responses to notifications',
          status: 'FAILURE',
          timestamp: timestamp(),
          errorMessage: 'Server returned a JSON-RPC response envelope for a notification',
          details: {
            status: response.status,
            responseBody: response.body
          }
        });
      } else if (hasBody) {
        checks.push({
          id: 'server-notification-no-response',
          name: 'Server Notification Response Behavior',
          description: 'Server does not return JSON-RPC responses to notifications',
          status: 'WARNING',
          timestamp: timestamp(),
          errorMessage:
            'Notification response body should usually be empty when accepted',
          details: {
            status: response.status,
            responseBody: response.rawBody
          }
        });
      } else {
        checks.push({
          id: 'server-notification-no-response',
          name: 'Server Notification Response Behavior',
          description: 'Server does not return JSON-RPC responses to notifications',
          status: 'SUCCESS',
          timestamp: timestamp(),
          details: {
            status: response.status
          }
        });
      }
    } catch (error) {
      checks.push({
        id: 'server-notification-no-response',
        name: 'Server Notification Response Behavior',
        description: 'Server does not return JSON-RPC responses to notifications',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return checks;
  }
}

