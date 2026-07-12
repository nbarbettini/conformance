import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServerJsonRpcResponseValidationScenario } from './jsonrpc-response-validation';

describe('ServerJsonRpcResponseValidationScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS checks for valid result and error responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'init',
            result: {
              protocolVersion: '2025-11-25',
              capabilities: {},
              serverInfo: { name: 'server', version: '1.0.0' }
            }
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'mcp-session-id': 'session-1'
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'ping-id',
            result: {}
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json'
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 42,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          }),
          {
            status: 404,
            headers: {
              'content-type': 'application/json'
            }
          }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerJsonRpcResponseValidationScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(2);
    expect(checks[0].status).toBe('SUCCESS');
    expect(checks[1].status).toBe('SUCCESS');
  });

  it('returns FAILURE checks for invalid result and error responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'init',
            result: {
              protocolVersion: '2025-11-25',
              capabilities: {},
              serverInfo: { name: 'server', version: '1.0.0' }
            }
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'mcp-session-id': 'session-1'
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'wrong-id'
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json'
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: 'bad-code',
              message: 123
            }
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json'
            }
          }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerJsonRpcResponseValidationScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(2);
    expect(checks[0].status).toBe('FAILURE');
    expect(checks[1].status).toBe('FAILURE');
  });
});
