import {
  authFetch,
  AuthFetchOptions,
  AuthTestResult
} from '../auth/helpers/auth-fetch.js';
import { isRecord } from './helpers.js';

const INITIALIZE_REQUEST = {
  jsonrpc: '2.0',
  id: 'init',
  method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: {
      name: 'conformance-test-client',
      version: '1.0.0'
    }
  }
};

const isInitializeRequest = (body: unknown): boolean => {
  if (!isRecord(body)) {
    return false;
  }

  return body.method === 'initialize';
};

const stripSessionHeader = (
  headers?: Record<string, string>
): Record<string, string> | undefined => {
  if (!headers) {
    return headers;
  }

  const cleaned = { ...headers };
  delete cleaned['mcp-session-id'];
  return cleaned;
};

export function createSessionFetch(
  serverUrl: string,
  baseOptions: AuthFetchOptions = {}
): (options?: AuthFetchOptions) => Promise<AuthTestResult> {
  let initialized = false;
  let sessionId: string | undefined;

  return async (options: AuthFetchOptions = {}): Promise<AuthTestResult> => {
    const mergedOptions: AuthFetchOptions = {
      ...baseOptions,
      ...options,
      headers: {
        ...baseOptions.headers,
        ...options.headers
      }
    };

    if (!isInitializeRequest(mergedOptions.body) && !initialized) {
      const initResponse = await authFetch(serverUrl, {
        ...baseOptions,
        token: mergedOptions.token,
        timeout: mergedOptions.timeout,
        method: 'POST',
        headers: {
          ...stripSessionHeader(mergedOptions.headers),
          'mcp-protocol-version': '2025-11-25'
        },
        body: INITIALIZE_REQUEST
      });

      initialized = true;
      sessionId = initResponse.headers.get('mcp-session-id') ?? undefined;

      if (initResponse.status >= 400) {
        throw new Error(
          `Initialize failed with HTTP ${initResponse.status}`
        );
      }
    }

    const requestHeaders = {
      ...mergedOptions.headers,
      ...(sessionId ? { 'mcp-session-id': sessionId } : {})
    };

    return authFetch(serverUrl, {
      ...mergedOptions,
      headers: requestHeaders
    });
  };
}

