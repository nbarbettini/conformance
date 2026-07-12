import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServerSessionDeleteSupportScenario } from './session-delete-support';

describe('ServerSessionDeleteSupportScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when DELETE responds with 200', async () => {
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
      .mockResolvedValueOnce(new Response('', { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerSessionDeleteSupportScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns SUCCESS when DELETE responds with 405', async () => {
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
      .mockResolvedValueOnce(new Response('', { status: 405 }));

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerSessionDeleteSupportScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when DELETE responds with unexpected status', async () => {
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
      .mockResolvedValueOnce(new Response('', { status: 500 }));

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerSessionDeleteSupportScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
  });

  it('returns SKIPPED when initialize does not provide session id', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
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
    );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerSessionDeleteSupportScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SKIPPED');
  });
});
