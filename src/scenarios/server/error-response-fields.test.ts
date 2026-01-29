import { describe, it, expect, afterEach, vi } from 'vitest';

import { ServerErrorResponseFieldsScenario } from './error-response-fields';

describe('ServerErrorResponseFieldsScenario', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns SUCCESS when error response includes code and message', async () => {
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

    const scenario = new ServerErrorResponseFieldsScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('SUCCESS');
  });

  it('returns FAILURE when error response is missing a message', async () => {
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
            error: { code: -32601 },
            id: 'req-1'
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    const scenario = new ServerErrorResponseFieldsScenario();
    const checks = await scenario.run('http://localhost:3000/mcp');

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe('FAILURE');
    expect(checks[0].errorMessage).toContain('message');
  });
});

