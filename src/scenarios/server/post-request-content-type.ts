/**
 * Streamable HTTP POST response content-type scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#sending-messages-to-the-server
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { createSessionFetch } from './helpers/session-fetch.js';

const REQUEST_BODY = {
  jsonrpc: '2.0',
  id: 1,
  method: 'ping'
};

const isSupportedContentType = (value: string | null): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return (
    normalized.includes('application/json') ||
    normalized.includes('text/event-stream')
  );
};

export class ServerPostRequestContentTypeScenario implements ClientScenario {
  name = 'server-post-request-content-type';
  description = `Test that POST requests return JSON or event-stream content types.

**Behavior**: For JSON-RPC requests over POST:
- Response Content-Type MUST be \`application/json\` or \`text/event-stream\``;

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
        body: REQUEST_BODY
      });
    } catch (error) {
      checks.push({
        id: 'server-post-request-content-type',
        name: 'POST Request Content-Type',
        description: 'POST request responses use JSON or event-stream content types',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      });
      return checks;
    }

    const contentType = response.headers.get('content-type');
    const okContentType = isSupportedContentType(contentType);

    if (response.status >= 400 || !okContentType) {
      checks.push({
        id: 'server-post-request-content-type',
        name: 'POST Request Content-Type',
        description: 'POST request responses use JSON or event-stream content types',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: okContentType
          ? `Expected success status, got ${response.status}`
          : `Unsupported Content-Type: ${contentType ?? 'missing'}`,
        details: {
          status: response.status,
          contentType: contentType ?? undefined
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
      id: 'server-post-request-content-type',
      name: 'POST Request Content-Type',
      description: 'POST request responses use JSON or event-stream content types',
      status: 'SUCCESS',
      timestamp: timestamp(),
      details: {
        status: response.status,
        contentType: contentType ?? undefined
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

