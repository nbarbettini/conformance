/**
 * _meta field acceptance scenario.
 * Ref: https://modelcontextprotocol.io/specification/2025-11-25/basic#_meta
 */

import { ClientScenario, ConformanceCheck } from '../../types.js';
import { createSessionFetch } from './helpers/session-fetch.js';
import { isRecord } from './helpers/helpers.js';

const META_REQUEST = {
  jsonrpc: '2.0',
  id: 1,
  method: 'ping',
  params: {
    _meta: {
      'com.example/debug': true
    }
  }
};

export class ServerMetaFieldAcceptanceScenario implements ClientScenario {
  name = 'server-meta-field-acceptance';
  description = `Test that server accepts requests with _meta fields.

**Behavior**: The server MUST accept requests that include \`_meta\` fields.`;

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
        body: META_REQUEST
      });
    } catch (error) {
      checks.push({
        id: 'server-meta-field-acceptance',
        name: 'Meta Field Acceptance',
        description: 'Server accepts requests with _meta fields',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Request failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      });
      return checks;
    }

    if (response.status >= 400) {
      checks.push({
        id: 'server-meta-field-acceptance',
        name: 'Meta Field Acceptance',
        description: 'Server accepts requests with _meta fields',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: `Expected success status, got ${response.status}`,
        details: {
          status: response.status
        },
        specReferences: [
          {
            id: 'MCP-Meta-Fields',
            url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic#_meta'
          }
        ]
      });
      return checks;
    }

    if (isRecord(response.body) && 'error' in response.body) {
      checks.push({
        id: 'server-meta-field-acceptance',
        name: 'Meta Field Acceptance',
        description: 'Server accepts requests with _meta fields',
        status: 'FAILURE',
        timestamp: timestamp(),
        errorMessage: 'Server rejected request containing _meta fields',
        details: {
          status: response.status
        },
        specReferences: [
          {
            id: 'MCP-Meta-Fields',
            url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic#_meta'
          }
        ]
      });
      return checks;
    }

    checks.push({
      id: 'server-meta-field-acceptance',
      name: 'Meta Field Acceptance',
      description: 'Server accepts requests with _meta fields',
      status: 'SUCCESS',
      timestamp: timestamp(),
      details: {
        status: response.status
      },
      specReferences: [
        {
          id: 'MCP-Meta-Fields',
          url: 'https://modelcontextprotocol.io/specification/2025-11-25/basic#_meta'
        }
      ]
    });

    return checks;
  }
}

