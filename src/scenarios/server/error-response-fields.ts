/**
 * JSON-RPC error response field validation scenario.
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

const hasErrorFields = (errorValue: unknown): boolean => {
  if (!isRecord(errorValue)) {
    return false;
  }

  return 'code' in errorValue && typeof errorValue.message === 'string';
};

export class ServerErrorResponseFieldsScenario implements ClientScenario {
  name = 'server-error-response-fields';
  description = `Test that JSON-RPC error responses include code and message fields.

**Behavior**: For JSON-RPC error responses:
- The \`error\` object MUST include \`code\` and \`message\``;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();
    const errors: string[] = [];
    const details: Array<{
      requestId: RequestId;
      status?: number;
      hasErrorFields?: boolean;
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

      const errorValue = response.body.error;
      const hasFields = hasErrorFields(errorValue);
      details.push({ requestId, status: response.status, hasErrorFields: hasFields });

      if (!hasFields) {
        errors.push(
          `Error response missing code/message for id ${formatId(requestId)}`
        );
      }
    }

    checks.push({
      id: 'server-error-response-fields',
      name: 'Error Response Fields',
      description: 'Server error responses include code and message fields',
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

