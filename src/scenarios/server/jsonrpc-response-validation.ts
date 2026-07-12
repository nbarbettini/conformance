/**
 * JSON-RPC response envelope validation scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic#messages
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { createSessionFetch } from './helpers/session-fetch.js';

type JsonRpcEnvelope = {
  jsonrpc?: unknown;
  id?: unknown;
  result?: unknown;
  error?: unknown;
};

const PING_REQUEST_ID = 'ping-id';
const UNKNOWN_REQUEST_ID = 42;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asJsonRpcEnvelope(value: unknown): JsonRpcEnvelope | null {
  if (!isRecord(value)) {
    return null;
  }

  return value as JsonRpcEnvelope;
}

export class ServerJsonRpcResponseValidationScenario implements ClientScenario {
  name = 'server-jsonrpc-response-validation';
  description = `Test that JSON-RPC result and error responses are well-formed.

**Behavior**:
- Result responses MUST include the same id as the request
- Result responses MUST include a result field
- Error responses MUST include the same id as the request
- Error responses MUST include an error object with integer code and string message`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();
    const sessionFetch = createSessionFetch(serverUrl, {
      headers: {
        'mcp-protocol-version': '2025-11-25'
      }
    });

    try {
      const pingResponse = await sessionFetch({
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          id: PING_REQUEST_ID,
          method: 'ping',
          params: {}
        }
      });

      const pingBody = asJsonRpcEnvelope(pingResponse.body);
      const hasMatchingId = pingBody?.id === PING_REQUEST_ID;
      const hasResultField =
        pingBody !== null && Object.prototype.hasOwnProperty.call(pingBody, 'result');

      checks.push({
        id: 'server-jsonrpc-result-response-validation',
        name: 'JSON-RPC Result Response Validation',
        description: 'Result response includes matching id and result field',
        status: hasMatchingId && hasResultField ? 'SUCCESS' : 'FAILURE',
        timestamp: timestamp(),
        errorMessage:
          hasMatchingId && hasResultField
            ? undefined
            : `Invalid result response (id match: ${String(hasMatchingId)}, result field: ${String(hasResultField)})`,
        details: {
          status: pingResponse.status,
          responseBody: pingResponse.body
        }
      });

      const errorResponse = await sessionFetch({
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          id: UNKNOWN_REQUEST_ID,
          method: 'mcpdebugger/unknown_method_for_conformance',
          params: {}
        }
      });

      const errorBody = asJsonRpcEnvelope(errorResponse.body);
      const hasErrorId = errorBody?.id === UNKNOWN_REQUEST_ID;
      const errorField = errorBody?.error;
      const hasErrorObject = isRecord(errorField);
      const hasIntegerErrorCode = hasErrorObject && Number.isInteger(errorField.code);
      const hasErrorMessage = hasErrorObject && typeof errorField.message === 'string';

      checks.push({
        id: 'server-jsonrpc-error-response-validation',
        name: 'JSON-RPC Error Response Validation',
        description: 'Error response includes matching id and valid error object',
        status:
          hasErrorId && hasErrorObject && hasIntegerErrorCode && hasErrorMessage
            ? 'SUCCESS'
            : 'FAILURE',
        timestamp: timestamp(),
        errorMessage:
          hasErrorId && hasErrorObject && hasIntegerErrorCode && hasErrorMessage
            ? undefined
            : `Invalid error response (id match: ${String(hasErrorId)}, error object: ${String(hasErrorObject)}, integer code: ${String(hasIntegerErrorCode)}, message: ${String(hasErrorMessage)})`,
        details: {
          status: errorResponse.status,
          responseBody: errorResponse.body
        }
      });
    } catch (error) {
      checks.push({
        id: 'server-jsonrpc-response-validation',
        name: 'JSON-RPC Response Validation',
        description: 'Server returns valid JSON-RPC result and error responses',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return checks;
  }
}
