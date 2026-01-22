import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerInvalidJsonRpcInputScenario } from './invalid-jsonrpc-input';

describe('ServerInvalidJsonRpcInputScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when server rejects JSON-RPC response input', async () => {
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
      return new Response('Bad Request', { status: 400 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerInvalidJsonRpcInputScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers?.['mcp-protocol-version']).toBe('2025-11-25');

    const body = JSON.parse(options?.body as string);
    expect(body.method).toBeUndefined();
    expect(body.result).toBeDefined();
    expect(body.id).toBe(1);

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when server accepts JSON-RPC response input', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('OK', { status: 200 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerInvalidJsonRpcInputScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
  });
});

