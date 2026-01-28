/**
 * JSON-RPC result response ID matching scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic#result-responses
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { createSessionFetch } from './helpers/session-fetch.js';
import { isRecord } from './helpers/helpers.js';

type RequestId = string | number;

const REQUEST_IDS: RequestId[] = [1, 'req-1'];

const basePingRequest = {
  jsonrpc: '2.0',
  method: 'ping'
};

const formatId = (value: RequestId | undefined): string =>
  value === undefined ? 'undefined' : JSON.stringify(value);

export class ServerResultResponseIdScenario implements ClientScenario {
  name = 'server-result-response-id';
  description = `Test that JSON-RPC result responses echo the request id.

**Behavior**: For JSON-RPC result responses:
- The \`id\` MUST be the same as the request \`id\`
- The request \`id\` may be a string or a number`;

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
            ...basePingRequest,
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

      if (response.status >= 400) {
        errors.push(
          `Expected success status for id ${formatId(
            requestId
          )}, got ${response.status}`
        );
        details.push({ requestId, status: response.status });
        continue;
      }

      if (!isRecord(response.body)) {
        errors.push(
          `Response body is not an object for id ${formatId(requestId)}`
        );
        details.push({ requestId, status: response.status });
        continue;
      }

      if (!('id' in response.body)) {
        errors.push(`Response missing id for request ${formatId(requestId)}`);
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
      id: 'server-result-response-id',
      name: 'Result Response ID',
      description: 'Server result responses include the same id as the request',
      status: errors.length === 0 ? 'SUCCESS' : 'FAILURE',
      timestamp: timestamp(),
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
      details: {
        attempts: details
      },
      specReferences: [
        {
          id: 'MCP-Result-Responses',
          url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic#result-responses'
        }
      ]
    });

    return checks;
  }
}

