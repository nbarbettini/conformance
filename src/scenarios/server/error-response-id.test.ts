import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerErrorResponseIdScenario } from './error-response-id';

describe('ServerErrorResponseIdScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when error response ids match request ids', async () => {
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
            error: { code: -32601, message: 'Method not found' },
            id: 1
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32601, message: 'Method not found' },
            id: 'req-1'
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerErrorResponseIdScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when error response id does not match request id', async () => {
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
            error: { code: -32601, message: 'Method not found' },
            id: 1
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32601, message: 'Method not found' },
            id: 'wrong-id'
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerErrorResponseIdScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
    expect(checks[0].errorMessage).toContain('Response id mismatch');
  });
});

