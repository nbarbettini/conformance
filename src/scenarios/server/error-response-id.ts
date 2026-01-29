/**
 * JSON-RPC error response ID matching scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic#error-responses
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { createSessionFetch } from './helpers/session-fetch.js';
import { isRecord } from './helpers/helpers.js';

type RequestId = string | number;

const REQUEST_IDS: RequestId[] = [1, 'req-1'];

const baseErrorRequest = {
  jsonrpc: '2.0',
  method: 'debug/method-does-not-exist'
};

const formatId = (value: RequestId | undefined): string =>
  value === undefined ? 'undefined' : JSON.stringify(value);

export class ServerErrorResponseIdScenario implements ClientScenario {
  name = 'server-error-response-id';
  description = `Test that JSON-RPC error responses echo the request id.

**Behavior**: For JSON-RPC error responses:
- The \`id\` MUST be the same as the request \`id\``;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();
    const errors: string[] = [];
    const details: Array<{
      requestId: RequestId;
      responseId?: unknown;
      status?: number;
    }> = [];
    const sessionFetch = createSessionFetch(serverUrl);

    for (const requestId of REQUEST_IDS) {
      let response: Awaited<ReturnType<typeof sessionFetch>>;

      try {
        response = await sessionFetch({
          method: 'POST',
          headers: {
            'mcp-protocol-version': '2025-11-25'
          },
          body: {
            ...baseErrorRequest,
            id: requestId
          }
        });
      } catch (error) {
        errors.push(
          `Request failed for id ${formatId(requestId)}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        details.push({ requestId });
        continue;
      }

      if (!isRecord(response.body)) {
        errors.push(
          `Response body is not an object for id ${formatId(requestId)}`
        );
        details.push({ requestId, status: response.status });
        continue;
      }

      if (!('error' in response.body)) {
        errors.push(
          `Expected error response for id ${formatId(requestId)}, got result`
        );
        details.push({ requestId, status: response.status });
        continue;
      }

      if (!('id' in response.body)) {
        errors.push(`Error response missing id for ${formatId(requestId)}`);
        details.push({ requestId, status: response.status });
        continue;
      }

      const responseId = response.body.id;
      details.push({ requestId, responseId, status: response.status });

      if (responseId !== requestId) {
        errors.push(
          `Response id mismatch (expected ${formatId(
            requestId
          )}, got ${formatId(responseId as RequestId)})`
        );
      }
    }

    checks.push({
      id: 'server-error-response-id',
      name: 'Error Response ID',
      description: 'Server error responses include the same id as the request',
      status: errors.length === 0 ? 'SUCCESS' : 'FAILURE',
      timestamp: timestamp(),
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
      details: {
        attempts: details
      },
      specReferences: [
        {
          id: 'MCP-Error-Responses',
          url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic#error-responses'
        }
      ]
    });

    return checks;
  }
}

