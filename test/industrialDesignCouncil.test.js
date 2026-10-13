const test = require("node:test");
const assert = require("node:assert/strict");
const { REQUIRED_METRICS, METRIC_UNITS, reviewPhysicalProposal } = require("../src/agents/industrialDesignCouncil");

function completeEvidence() {
  return Object.fromEntries(REQUIRED_METRICS.map(metric => [metric, {
    value: metric === 'external_dimensions' ? { width: 2400, depth: 1500, height: 2300 } : metric === 'service_access' ? 'Rear removable panel; isolate electrical supply before opening.' : 10,
    unit: METRIC_UNITS[metric][0],
    source: `synthetic-fixture/measurement-sheet#${metric}`,
  }]));
}

test("blocks render-only physical proposals", () => {
  const result = reviewPhysicalProposal({ id: "DRM-MICRO-V2", evidence: { render: true } });
  assert.equal(result.status, "EVIDENCE_REQUIRED");
  assert.equal(result.evidence_gate.passed, false);
  assert.ok(result.evidence_gate.missing.length > 0);
});

test("passes complete measurable evidence to specialist review without authorising execution", () => {
  const evidence = completeEvidence();
  const result = reviewPhysicalProposal({ id: "DRM-MICRO-V2", evidence });
  assert.equal(result.status, "READY_FOR_SPECIALIST_REVIEW");
  assert.equal(result.authority.autonomous_execution, false);
  assert.equal(result.authority.consequential_action, "HUMAN_APPROVAL_REQUIRED");
  assert.deepEqual(result.sequence.slice(0,3), ["FORGE","FOUNDRY","GRID"]);
});

test('all-present blank placeholders cannot pass evidence gate', () => {
  for (const value of ['', ' ', {}, [], 'measured', false]) {
    const evidence = Object.fromEntries(REQUIRED_METRICS.map(metric => [metric, value]));
    const gate = reviewPhysicalProposal({ evidence }).evidence_gate;
    assert.equal(gate.passed, false);
    assert.equal(gate.missing.length, 0);
    assert.equal(gate.invalid.length, REQUIRED_METRICS.length);
  }
});

test('nonpositive nonfinite and coerced measurement values are blocked', () => {
  for (const value of [-1, 0, NaN, Infinity, '10', [], {}, null]) {
    const evidence = completeEvidence();
    evidence.power_load.value = value;
    assert.equal(reviewPhysicalProposal({ evidence }).evidence_gate.passed, false);
  }
});

test('provenance and appropriate units are required', () => {
  for (const patch of [{ source: undefined }, { source: '  ' }, { source: {} }, { unit: 'kg' }, { unit: '' }]) {
    const evidence = completeEvidence();
    Object.assign(evidence.power_load, patch);
    const gate = reviewPhysicalProposal({ evidence }).evidence_gate;
    assert.equal(gate.passed, false);
    assert.equal(gate.invalid[0].metric, 'power_load');
  }
});

test('dimensions require all positive components and counts require whole units', () => {
  for (const patch of [
    { external_dimensions: { value: { width: 2400, depth: -1, height: 2300 }, unit: 'mm', source: 'drawing/1' } },
    { external_dimensions: { value: { width: 2400 }, unit: 'mm', source: 'drawing/1' } },
    { tray_capacity: { value: 1.5, unit: 'trays', source: 'test/1' } },
    { service_access: { value: ' ', unit: 'description', source: 'drawing/1' } },
  ]) assert.equal(reviewPhysicalProposal({ evidence: { ...completeEvidence(), ...patch } }).evidence_gate.passed, false);
});
