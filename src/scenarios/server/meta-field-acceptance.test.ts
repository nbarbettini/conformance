import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServerMetaFieldAcceptanceScenario } from './meta-field-acceptance';

describe('ServerMetaFieldAcceptanceScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when ping with _meta is accepted', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{}', {
          status: 200,
          headers: {
            'mcp-session-id': 'session-1',
            'content-type': 'application/json'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 'ping-control', result: {} }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 'ping-meta', result: {} }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerMetaFieldAcceptanceScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns FAILURE when control ping succeeds but _meta ping is rejected', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{}', {
          status: 200,
          headers: {
            'mcp-session-id': 'session-1',
            'content-type': 'application/json'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 'ping-control', result: {} }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'ping-meta',
            error: { code: -32602, message: 'Invalid params' }
          }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerMetaFieldAcceptanceScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
  });

  it('returns SKIPPED when control ping fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{}', {
          status: 200,
          headers: {
            'mcp-session-id': 'session-1',
            'content-type': 'application/json'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'ping-control',
            error: { code: -32601, message: 'Method not found' }
          }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerMetaFieldAcceptanceScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SKIPPED');
  });
});
