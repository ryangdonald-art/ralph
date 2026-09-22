const test = require("node:test");
const assert = require("node:assert/strict");
const { REQUIRED_METRICS, reviewPhysicalProposal } = require("../src/agents/industrialDesignCouncil");

test("blocks render-only physical proposals", () => {
  const result = reviewPhysicalProposal({ id: "DRM-MICRO-V2", evidence: { render: true } });
  assert.equal(result.status, "EVIDENCE_REQUIRED");
  assert.equal(result.evidence_gate.passed, false);
  assert.ok(result.evidence_gate.missing.length > 0);
});

test("passes complete measurable evidence to specialist review without authorising execution", () => {
  const evidence = Object.fromEntries(REQUIRED_METRICS.map((k) => [k, "measured"]));
  const result = reviewPhysicalProposal({ id: "DRM-MICRO-V2", evidence });
  assert.equal(result.status, "READY_FOR_SPECIALIST_REVIEW");
  assert.equal(result.authority.autonomous_execution, false);
  assert.equal(result.authority.consequential_action, "HUMAN_APPROVAL_REQUIRED");
  assert.deepEqual(result.sequence.slice(0,3), ["FORGE","FOUNDRY","GRID"]);
});
