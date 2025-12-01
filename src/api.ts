/**
 * Programmatic API for MCP Conformance Suite
 *
 * This module exposes the conformance suite functionality for use as a library,
 * rather than just as a CLI tool.
 */

// Runner exports
export { runServerConformanceTest } from './runner/server.js';

// Scenario exports
export {
  clientScenarios,
  getClientScenario,
  listClientScenarios,
  listActiveClientScenarios,
  listPendingClientScenarios,
} from './scenarios/index.js';

// Type exports
export type {
  ConformanceCheck,
  ClientScenario,
  CheckStatus,
  SpecReference,
} from './types.js';

// Client helper for direct use
export { connectToServer } from './scenarios/server/client-helper.js';
export type { MCPClientConnection } from './scenarios/server/client-helper.js';

