const COUNCIL = Object.freeze({
  FORGE: {
    id: "FORGE",
    role: "Industrial Design & Human Factors",
    question: "Is this beautifully simple to use?",
    owns: ["ergonomics","reach zones","operator movement","accessibility","materials","cleanability","physical form","human factors"],
  },
  FOUNDRY: {
    id: "FOUNDRY",
    role: "Engineering & Design for Manufacture",
    question: "Can we manufacture this reliably and economically at scale?",
    owns: ["DFM","BOM","tolerances","fabrication","structure","heat","ventilation","electrical","plumbing","refrigeration","serviceability","transport","installation","compliance"],
  },
  GRID: {
    id: "GRID",
    role: "Retail Systems & Spatial Design",
    question: "Does every square metre earn its keep?",
    owns: ["customer flow","queues","sightlines","merchandising","throughput","footprint economics","signage","site adaptation","rollout speed"],
  },
});

const REQUIRED_METRICS = Object.freeze([
  "external_dimensions","operator_clearances","reach_zones","service_clearances",
  "storage_capacity","tray_capacity","holding_capacity","transactions_per_hour",
  "power_load","cleaning_time","service_access","assembly_time","transport_volume",
  "capex","bom_cost"
]);

function evidenceGate(proposal = {}) {
  const evidence = proposal.evidence || {};
  const missing = REQUIRED_METRICS.filter((metric) => evidence[metric] === undefined || evidence[metric] === null);
  return { passed: missing.length === 0, missing };
}

function reviewPhysicalProposal(proposal = {}) {
  const gate = evidenceGate(proposal);
  return {
    council: Object.values(COUNCIL),
    proposal_id: proposal.id || null,
    evidence_gate: gate,
    rule: "A render is never evidence that a design works.",
    sequence: ["FORGE","FOUNDRY","GRID","RAT","NONO","RALPH","HUMAN_APPROVAL"],
    status: gate.passed ? "READY_FOR_SPECIALIST_REVIEW" : "EVIDENCE_REQUIRED",
    authority: {
      synthesis: "RALPH",
      consequential_action: "HUMAN_APPROVAL_REQUIRED",
      autonomous_execution: false,
    },
  };
}

module.exports = { COUNCIL, REQUIRED_METRICS, evidenceGate, reviewPhysicalProposal };
