import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerProtocolVersionValidationScenario } from './protocol-version-validation';

describe('ServerProtocolVersionValidationScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when server rejects invalid protocol version', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('OK', {
          status: 200,
          headers: { 'mcp-session-id': 'session-1' }
        })
      )
      .mockResolvedValueOnce(new Response('Bad Request', { status: 400 }));

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerProtocolVersionValidationScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, initOptions] = fetchMock.mock.calls[0];
    const initHeaders = initOptions?.headers as Record<string, string>;
    expect(initHeaders?.['mcp-protocol-version']).toBe('2025-11-25');
    const initBody = JSON.parse(initOptions?.body as string) as {
      jsonrpc: string;
      method: string;
      params: {
        protocolVersion: string;
      };
      id: string;
    };
    expect(initBody.method).toBe('initialize');

    const [, options] = fetchMock.mock.calls[1];
    const headers = options?.headers as Record<string, string>;
    expect(headers?.['mcp-protocol-version']).toBe('invalid-version');
    const requestBody = JSON.parse(options?.body as string) as {
      jsonrpc: string;
      method: string;
      id: number;
    };
    expect(requestBody).toEqual({
      jsonrpc: '2.0',
      method: 'ping',
      id: 1
    });

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when server accepts invalid protocol version', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('OK', { status: 200 }))
      .mockResolvedValueOnce(new Response('OK', { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerProtocolVersionValidationScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
  });
});

