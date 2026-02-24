import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServerNotificationNoResponseScenario } from './notification-no-response';

describe('ServerNotificationNoResponseScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when notification does not receive a JSON-RPC response body', async () => {
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
      .mockResolvedValueOnce(new Response('', { status: 202 }));

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerNotificationNoResponseScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, notificationOptions] = fetchMock.mock.calls[1];
    const notificationBody = JSON.parse(notificationOptions?.body as string) as {
      method: string;
      id?: unknown;
    };
    expect(notificationBody.method).toBe('notifications/initialized');
    expect(notificationBody.id).toBeUndefined();

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when notification receives a JSON-RPC response envelope', async () => {
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
              'content-type': 'application/json'
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 99,
            result: {}
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json'
            }
          }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerNotificationNoResponseScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
    expect(checks[0].errorMessage).toContain('JSON-RPC response envelope');
  });
});

