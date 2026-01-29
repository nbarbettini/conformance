/**
 * Streamable HTTP GET content-type scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#listening-for-messages-from-the-server
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { authFetch } from './auth/helpers/auth-fetch.js';

const isSseContentType = (value: string | null): boolean =>
  value?.toLowerCase().includes('text/event-stream') ?? false;

export class ServerGetSseContentTypeScenario implements ClientScenario {
  name = 'server-get-sse-content-type';
  description = `Test that GET responses return SSE content-type or 405.

**Behavior**: On GET to the MCP endpoint:
- Return Content-Type \`text/event-stream\` OR
- Return HTTP 405 Method Not Allowed`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();

    let response: Awaited<ReturnType<typeof authFetch>>;

    try {
      response = await authFetch(serverUrl, {
        method: 'GET',
        headers: {
          'mcp-protocol-version': '2025-11-25'
        }
      });
    } catch (error) {
      checks.push({
        id: 'server-get-sse-content-type',
        name: 'GET SSE Content-Type',
        description: 'GET returns SSE content-type or 405',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      });
      return checks;
    }

    const contentType = response.headers.get('content-type');
    const okContentType = isSseContentType(contentType);
    const okStatus = response.status === 405;

    if (!okStatus && !okContentType) {
      checks.push({
        id: 'server-get-sse-content-type',
        name: 'GET SSE Content-Type',
        description: 'GET returns SSE content-type or 405',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Expected 405 or text/event-stream, got ${response.status} with ${contentType ?? 'missing'} Content-Type`,
        details: {
          status: response.status,
          contentType: contentType ?? undefined
        },
        specReferences: [
          {
            id: 'MCP-Streamable-HTTP-GET',
            url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#listening-for-messages-from-the-server'
          }
        ]
      });
      return checks;
    }

    checks.push({
      id: 'server-get-sse-content-type',
      name: 'GET SSE Content-Type',
      description: 'GET returns SSE content-type or 405',
      status: 'SUCCESS',
      timestamp: timestamp(),
      details: {
        status: response.status,
        contentType: contentType ?? undefined
      },
      specReferences: [
        {
          id: 'MCP-Streamable-HTTP-GET',
          url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#listening-for-messages-from-the-server'
        }
      ]
    });

    return checks;
  }
}

