import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerMetaFieldAcceptanceScenario } from './meta-field-acceptance';

describe('ServerMetaFieldAcceptanceScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when server accepts requests with _meta fields', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            result: { capabilities: {} },
            id: 'init'
          }),
          { status: 200, headers: { 'Mcp-Session-Id': 'session-123' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            result: {},
            id: 1
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerMetaFieldAcceptanceScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when server rejects requests with _meta fields', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            result: { capabilities: {} },
            id: 'init'
          }),
          { status: 200, headers: { 'Mcp-Session-Id': 'session-123' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Invalid params' },
            id: 1
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerMetaFieldAcceptanceScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
    expect(checks[0].errorMessage).toContain('_meta');
  });
});

