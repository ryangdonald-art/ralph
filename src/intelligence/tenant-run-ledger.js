'use strict';
/**
 * Nonproduction tenant-scoped event ledger. Data is memory-only, not authenticated,
 * encrypted, transactional or suitable for production use.
 */
function createTenantRunLedger() {
  const events = new Map();
  const runIds = new Set();
  function valid(value) { return typeof value === 'string' && value.trim().length > 0; }
  return Object.freeze({
    append(event) {
      if (!event || !valid(event.tenantId) || !valid(event.runId) || !valid(event.role) || !valid(event.status)) throw new Error('Invalid tenant run event');
      if (runIds.has(event.runId)) throw new Error('Duplicate global run ID');
      const snapshot = Object.freeze({...event});
      runIds.add(event.runId);
      if (!events.has(event.tenantId)) events.set(event.tenantId, []);
      events.get(event.tenantId).push(snapshot);
      return snapshot;
    },
    list(tenantId) {
      if (!valid(tenantId)) throw new Error('Tenant ID required');
      return (events.get(tenantId) || []).map(event => ({...event}));
    }
  });
}
module.exports = {createTenantRunLedger};
