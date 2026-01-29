import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerGetSseContentTypeScenario } from './get-sse-content-type';

describe('ServerGetSseContentTypeScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when GET responds with 405', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 405 }));

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerGetSseContentTypeScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when GET responds without SSE content-type', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('ok', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerGetSseContentTypeScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
    expect(checks[0].errorMessage).toContain('Content-Type');
  });
});

