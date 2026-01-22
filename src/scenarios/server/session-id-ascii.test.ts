import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerSessionIdAsciiScenario } from './session-id-ascii';

describe('ServerSessionIdAsciiScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when session id is visible ASCII', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          result: { capabilities: {} },
          id: 1
        }),
        {
          status: 200,
          headers: { 'Mcp-Session-Id': 'session-1234-ABCD' }
        }
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerSessionIdAsciiScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns INFO when session id is missing', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          result: { capabilities: {} },
          id: 1
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerSessionIdAsciiScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('INFO');
  });

  it('returns FAILURE when session id contains non-visible ASCII', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          result: { capabilities: {} },
          id: 1
        }),
        {
          status: 200,
          headers: { 'mcp-session-id': 'session 1234' }
        }
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerSessionIdAsciiScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
  });
});

