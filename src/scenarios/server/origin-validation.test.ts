import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerOriginValidationScenario } from './origin-validation';

describe('ServerOriginValidationScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when server responds 403 to invalid Origin', async () => {
    const fetchMock = vi.fn(async (_url: string, _options?: RequestInit) => {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Invalid origin' }
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerOriginValidationScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers?.Origin).toBe('https://example.invalid');
    expect(headers?.['mcp-protocol-version']).toBe('2025-11-25');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns WARNING when server does not respond 403', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('OK', { status: 200 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerOriginValidationScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('WARNING');
    expect(checks[0].errorMessage).toContain('Expected 403');
  });
});

