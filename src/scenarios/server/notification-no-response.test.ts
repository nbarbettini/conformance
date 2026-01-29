import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerNotificationNoResponseScenario } from './notification-no-response';

describe('ServerNotificationNoResponseScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when notification yields no JSON-RPC response', async () => {
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
      .mockResolvedValueOnce(new Response('', { status: 202 }));

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerNotificationNoResponseScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when notification yields a JSON-RPC response', async () => {
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

    const scenario = new ServerNotificationNoResponseScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
    expect(checks[0].errorMessage).toContain('JSON-RPC response');
  });
});

