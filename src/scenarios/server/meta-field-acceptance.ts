/**
 * _meta request field acceptance scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic#_meta
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { authFetch } from './auth/helpers/auth-fetch.js';

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

const CONTROL_PING_REQUEST = {
  jsonrpc: '2.0',
  id: 'ping-control',
  method: 'ping',
  params: {}
};

const META_PING_REQUEST = {
  jsonrpc: '2.0',
  id: 'ping-meta',
  method: 'ping',
  params: {
    _meta: {
      'com.mcpdebugger/test': '1'
    }
  }
};

export class ServerMetaFieldAcceptanceScenario implements ClientScenario {
  name = 'server-meta-field-acceptance';
  description = `Test that server accepts valid requests containing _meta fields.

**Behavior**:
- Control ping request should succeed
- Equivalent ping request with params._meta should also be accepted`;

  async run(serverUrl: string): Promise<ConformanceCheck[]> {
    const checks: ConformanceCheck[] = [];
    const timestamp = () => new Date().toISOString();

    try {
      const initResponse = await authFetch(serverUrl, {
        method: 'POST',
        headers: {
          'mcp-protocol-version': '2025-11-25'
        },
        body: INITIALIZE_REQUEST
      });

      if (initResponse.status >= 400) {
        checks.push({
          id: 'server-meta-field-acceptance',
          name: 'Server _meta Field Acceptance',
          description: 'Server accepts requests containing _meta fields',
          status: 'SKIPPED',
          timestamp: timestamp(),
          errorMessage: `Initialize failed with HTTP ${initResponse.status}; cannot evaluate _meta acceptance`,
          details: {
            initializeStatus: initResponse.status
          }
        });
        return checks;
      }

      const sessionId = initResponse.headers.get('mcp-session-id') ?? undefined;
      const requestHeaders = {
        'mcp-protocol-version': '2025-11-25',
        ...(sessionId ? { 'mcp-session-id': sessionId } : {})
      };

      const controlResponse = await authFetch(serverUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: CONTROL_PING_REQUEST
      });

      if (controlResponse.status >= 400) {
        checks.push({
          id: 'server-meta-field-acceptance',
          name: 'Server _meta Field Acceptance',
          description: 'Server accepts requests containing _meta fields',
          status: 'SKIPPED',
          timestamp: timestamp(),
          errorMessage:
            `Control ping failed with HTTP ${controlResponse.status}; cannot attribute failures to _meta`,
          details: {
            controlStatus: controlResponse.status,
            controlBody: controlResponse.body
          }
        });
        return checks;
      }

      const metaResponse = await authFetch(serverUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: META_PING_REQUEST
      });

      checks.push({
        id: 'server-meta-field-acceptance',
        name: 'Server _meta Field Acceptance',
        description: 'Server accepts requests containing _meta fields',
        status: metaResponse.status < 400 ? 'SUCCESS' : 'FAILURE',
        timestamp: timestamp(),
        errorMessage:
          metaResponse.status < 400
            ? undefined
            : `Control ping succeeded, but ping with _meta failed (HTTP ${metaResponse.status})`,
        details: {
          controlStatus: controlResponse.status,
          metaStatus: metaResponse.status,
          metaBody: metaResponse.body
        }
      });
    } catch (error) {
      checks.push({
        id: 'server-meta-field-acceptance',
        name: 'Server _meta Field Acceptance',
        description: 'Server accepts requests containing _meta fields',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return checks;
  }
}
