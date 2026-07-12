import crypto from 'node:crypto';

import { ClientScenario, ConformanceCheck } from '../../../../types';
import { authFetch } from '../helpers/auth-fetch';
import { ServerAuthSpecReferences } from '../spec-references';

type ProbeRequest = {
  body: Record<string, unknown>;
  headers: Record<string, string>;
};

const INITIALIZE_REQUEST = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: {
      name: 'conformance-auth-test',
      version: '1.0.0'
    }
  }
};

const TOOLS_LIST_REQUEST = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {}
};

function base64Url(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createUnsignedJwt(): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: 'https://example.invalid',
      sub: 'conformance-test',
      aud: 'https://example.invalid/mcp',
      exp: Math.floor(Date.now() / 1000) + 60
    })
  );

  return `${header}.${payload}`;
}

function createAlgNoneJwt(): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: 'https://example.invalid',
      sub: 'conformance-test',
      aud: 'https://example.invalid/mcp',
      exp: Math.floor(Date.now() / 1000) + 60
    })
  );

  return `${header}.${payload}.`;
}

function createSelfSignedJwt(): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: 'https://attacker.invalid',
      sub: 'attacker',
      aud: 'https://example.invalid/mcp',
      exp: Math.floor(Date.now() / 1000) + 300
    })
  );

  const signingInput = `${header}.${payload}`;
  const signature = crypto
    .createHmac('sha256', 'conformance-self-signed-test-key')
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signature}`;
}

async function findProtectedProbeRequest(serverUrl: string): Promise<ProbeRequest | null> {
  const toolsResponse = await authFetch(serverUrl, {
    method: 'POST',
    body: TOOLS_LIST_REQUEST
  });

  if (toolsResponse.status === 401) {
    return {
      body: TOOLS_LIST_REQUEST,
      headers: {}
    };
  }

  const initResponse = await authFetch(serverUrl, {
    method: 'POST',
    body: INITIALIZE_REQUEST
  });

  if (initResponse.status === 401) {
    return {
      body: INITIALIZE_REQUEST,
      headers: {}
    };
  }

  const sessionId = initResponse.headers.get('mcp-session-id');
  if (initResponse.status === 200 && sessionId) {
    const toolsWithSession = await authFetch(serverUrl, {
      method: 'POST',
      headers: {
        'mcp-session-id': sessionId
      },
      body: TOOLS_LIST_REQUEST
    });

    if (toolsWithSession.status === 401) {
      return {
        body: TOOLS_LIST_REQUEST,
        headers: {
          'mcp-session-id': sessionId
        }
      };
    }
  }

  return null;
}

export class AuthTokenValidationSmokeScenario implements ClientScenario {
  name = 'server/auth-token-validation-smoke';
  description = `Test server rejection behavior for malformed and invalid access token inputs.

**Checks**:
- Reject malformed Authorization header
- Reject Bearer header with garbage token
- Reject unsigned JWT
- Reject JWT with alg=none
- Reject self-signed JWT`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();

    let probe: ProbeRequest | null;

    try {
      probe = await findProtectedProbeRequest(serverUrl);
    } catch (error) {
      checks.push({
        id: 'auth-token-validation-probe-prerequisite',
        name: 'Protected Endpoint Probe',
        description: 'Find a protected request path to validate token rejection behavior',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Probe failed: ${error instanceof Error ? error.message : String(error)}`,
        specReferences: [
          ServerAuthSpecReferences.OAUTH_2_1_TOKEN_VALIDATION,
          ServerAuthSpecReferences.MCP_AUTH_ACCESS_TOKEN
        ]
      });
      return checks;
    }

    if (!probe) {
      checks.push({
        id: 'auth-token-validation-probe-prerequisite',
        name: 'Protected Endpoint Probe',
        description: 'Find a protected request path to validate token rejection behavior',
        status: 'SKIPPED',
        timestamp: timestamp(),
        errorMessage:
          'Could not identify a request that reliably requires authorization; token validation smoke checks skipped',
        specReferences: [
          ServerAuthSpecReferences.OAUTH_2_1_TOKEN_VALIDATION,
          ServerAuthSpecReferences.MCP_AUTH_ACCESS_TOKEN
        ]
      });
      return checks;
    }

    checks.push({
      id: 'auth-token-validation-probe-prerequisite',
      name: 'Protected Endpoint Probe',
      description: 'Found a protected request path for token validation checks',
      status: 'SUCCESS',
      timestamp: timestamp(),
      details: {
        method: probe.body.method,
        hasSessionHeader: Boolean(probe.headers['mcp-session-id'])
      }
    });

    const attempts = [
      {
        id: 'auth-token-malformed-header-401',
        description: 'Malformed Authorization header is rejected with HTTP 401',
        header: 'foo'
      },
      {
        id: 'auth-token-garbage-bearer-401',
        description: 'Bearer header with garbage token is rejected with HTTP 401',
        header: 'Bearer foo'
      },
      {
        id: 'auth-token-unsigned-jwt-401',
        description: 'Unsigned JWT token is rejected with HTTP 401',
        header: `Bearer ${createUnsignedJwt()}`
      },
      {
        id: 'auth-token-jwt-none-alg-401',
        description: 'JWT with alg=none is rejected with HTTP 401',
        header: `Bearer ${createAlgNoneJwt()}`
      },
      {
        id: 'auth-token-self-signed-jwt-401',
        description: 'Self-signed JWT token is rejected with HTTP 401',
        header: `Bearer ${createSelfSignedJwt()}`
      }
    ] as const;

    for (const attempt of attempts) {
      try {
        const response = await authFetch(serverUrl, {
          method: 'POST',
          headers: {
            ...probe.headers,
            Authorization: attempt.header
          },
          body: probe.body
        });

        checks.push({
          id: attempt.id,
          name: 'Access Token Rejection',
          description: attempt.description,
          status: response.status === 401 ? 'SUCCESS' : 'FAILURE',
          timestamp: timestamp(),
          errorMessage:
            response.status === 401
              ? undefined
              : `Expected HTTP 401, got ${response.status}`,
          specReferences: [
            ServerAuthSpecReferences.OAUTH_2_1_TOKEN_VALIDATION,
            ServerAuthSpecReferences.OAUTH_2_1_ERROR_RESPONSE,
            ServerAuthSpecReferences.RFC_6750_BEARER_TOKEN,
            ServerAuthSpecReferences.MCP_AUTH_ACCESS_TOKEN
          ],
          details: {
            status: response.status,
            method: probe.body.method,
            hasWwwAuthenticate: Boolean(response.wwwAuthenticate),
            responseBody: response.body
          }
        });
      } catch (error) {
        checks.push({
          id: attempt.id,
          name: 'Access Token Rejection',
          description: attempt.description,
          status: 'FAILURE',
          timestamp: timestamp(),
          errorMessage: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
          specReferences: [
            ServerAuthSpecReferences.OAUTH_2_1_TOKEN_VALIDATION,
            ServerAuthSpecReferences.OAUTH_2_1_ERROR_RESPONSE,
            ServerAuthSpecReferences.RFC_6750_BEARER_TOKEN,
            ServerAuthSpecReferences.MCP_AUTH_ACCESS_TOKEN
          ]
        });
      }
    }

    return checks;
  }
}
