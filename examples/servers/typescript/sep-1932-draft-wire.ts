/**
 * Minimal stateless (2026-07-28, SEP-2575) wire for the SEP-1932 fixtures.
 *
 * The conformance CLI defaults to the draft protocol, whose first request is
 * `server/discover` with a per-request `_meta` envelope. The pinned SDK's
 * `StreamableHTTPServerTransport` (1.x) only speaks the initialize/session
 * lifecycle, so a fixture built on it alone rejects the probe before any DPoP
 * check runs. `everything-server.ts` solves this by dispatching draft requests
 * itself; this module does the same for the DPoP fixtures, with the smallest
 * surface the scenario needs: `server/discover`, `ping`, `tools/list`, and
 * `tools/call` for one tool.
 *
 * Authentication is the fixture's job and happens before this is called.
 */
import type { Request, Response } from 'express';

export const DRAFT_PROTOCOL_VERSION = '2026-07-28';

const META_PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
const META_CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities';
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';

/** Revisions that use the initialize/session lifecycle. */
const SESSION_ERA_VERSIONS: ReadonlySet<string> = new Set([
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25'
]);

/** Results whose draft form MUST carry the SEP-2549 caching hints. */
const CACHEABLE_METHODS: ReadonlySet<string> = new Set([
  'server/discover',
  'tools/list'
]);

export interface DraftTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  call: (args: Record<string, unknown>) => { type: 'text'; text: string }[];
}

export interface DraftWireOptions {
  serverInfo: { name: string; version: string };
  tools: DraftTool[];
}

type JsonRpcId = string | number | null;

function header(req: Request, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * True when the request is on the stateless wire: it carries a per-request
 * `_meta` envelope or names a non-session-era protocol version, and has no
 * session. Mirrors the dispatch rule in `everything-server.ts`.
 */
export function isDraftWireRequest(req: Request): boolean {
  if (header(req, 'mcp-session-id')) return false;
  const version = header(req, 'mcp-protocol-version');
  const meta = req.body?.params?._meta;
  const legacy =
    meta === undefined &&
    version !== undefined &&
    SESSION_ERA_VERSIONS.has(version);
  return Boolean(version || meta) && !legacy;
}

function sendError(
  res: Response,
  id: JsonRpcId,
  status: number,
  code: number,
  message: string,
  data?: unknown
): void {
  res.status(status).json({
    jsonrpc: '2.0',
    id,
    error: data === undefined ? { code, message } : { code, message, data }
  });
}

function sendResult(
  res: Response,
  id: JsonRpcId,
  method: string,
  result: Record<string, unknown>
): void {
  // Draft results MUST carry `resultType`; cacheable ones the caching hints.
  result.resultType ??= 'complete';
  if (CACHEABLE_METHODS.has(method)) {
    result.ttlMs ??= 0;
    result.cacheScope ??= 'private';
  }
  res.json({ jsonrpc: '2.0', id, result });
}

/** Answer one stateless request. Call only when `isDraftWireRequest` is true. */
export function handleDraftWire(
  req: Request,
  res: Response,
  options: DraftWireOptions
): void {
  const body = req.body ?? {};
  const id: JsonRpcId = body.id ?? null;
  const method: string | undefined = body.method;
  const params = body.params ?? {};
  const meta = params._meta;
  const headerVersion = header(req, 'mcp-protocol-version');
  const metaVersion = meta?.[META_PROTOCOL_VERSION];

  if (!headerVersion) {
    return sendError(
      res,
      id,
      400,
      -32020,
      'Missing MCP-Protocol-Version header'
    );
  }
  if (!meta || !metaVersion || !meta[META_CLIENT_CAPABILITIES]) {
    return sendError(
      res,
      id,
      400,
      -32602,
      'Invalid params: missing _meta or required fields'
    );
  }
  if (headerVersion !== metaVersion) {
    return sendError(
      res,
      id,
      400,
      -32020,
      'Mismatched MCP-Protocol-Version header'
    );
  }
  if (metaVersion !== DRAFT_PROTOCOL_VERSION) {
    return sendError(res, id, 400, -32022, 'UnsupportedProtocolVersionError', {
      supported: [DRAFT_PROTOCOL_VERSION],
      requested: String(metaVersion)
    });
  }

  switch (method) {
    case 'server/discover':
      return sendResult(res, id, method, {
        supportedVersions: [DRAFT_PROTOCOL_VERSION],
        capabilities: { tools: {} },
        _meta: { [META_SERVER_INFO]: options.serverInfo }
      });
    case 'ping':
      return sendResult(res, id, method, {});
    case 'tools/list':
      return sendResult(res, id, method, {
        tools: options.tools.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema
        }))
      });
    case 'tools/call': {
      const tool = options.tools.find((t) => t.name === params.name);
      if (!tool) {
        return sendError(res, id, 400, -32602, `Unknown tool: ${params.name}`);
      }
      return sendResult(res, id, method, {
        content: tool.call(params.arguments ?? {})
      });
    }
    default:
      return sendError(res, id, 400, -32601, `Method not found: ${method}`);
  }
}
