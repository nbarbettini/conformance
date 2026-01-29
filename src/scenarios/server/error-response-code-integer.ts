/**
 * JSON-RPC error response code integer scenario.
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

const isIntegerCode = (errorValue: unknown): boolean => {
  if (!isRecord(errorValue)) {
    return false;
  }

  return typeof errorValue.code === 'number' && Number.isInteger(errorValue.code);
};

export class ServerErrorResponseCodeIntegerScenario implements ClientScenario {
  name = 'server-error-response-code-integer';
  description = `Test that JSON-RPC error codes are integers.

**Behavior**: For JSON-RPC error responses:
- The \`error.code\` MUST be an integer`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();
    const errors: string[] = [];
    const details: Array<{
      requestId: RequestId;
      status?: number;
      codeIsInteger?: boolean;
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

      const errorValue = isRecord(response.body) ? response.body.error : undefined;
      const codeIsInteger = isIntegerCode(errorValue);
      details.push({ requestId, status: response.status, codeIsInteger });

      if (!codeIsInteger) {
        errors.push(
          `Error code is not an integer for id ${formatId(requestId)}`
        );
      }
    }

    checks.push({
      id: 'server-error-response-code-integer',
      name: 'Error Response Code Integer',
      description: 'Server error response codes are integers',
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

