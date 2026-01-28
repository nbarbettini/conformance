import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerResultResponseIdScenario } from './result-response-id';

describe('ServerResultResponseIdScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when response ids match string and number requests', async () => {
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
            result: { capabilities: {} },
            id: 1
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            result: { capabilities: {} },
            id: 'req-1'
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerResultResponseIdScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when response ids do not match request ids', async () => {
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
            result: { capabilities: {} },
            id: 1
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            result: { capabilities: {} },
            id: 'wrong-id'
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerResultResponseIdScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
    expect(checks[0].errorMessage).toContain('Response id mismatch');
  });
});

