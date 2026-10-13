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

const METRIC_UNITS = Object.freeze({
  external_dimensions: ['mm', 'cm', 'm'],
  operator_clearances: ['mm', 'cm', 'm'],
  reach_zones: ['mm', 'cm', 'm'],
  service_clearances: ['mm', 'cm', 'm'],
  storage_capacity: ['L', 'm3'],
  tray_capacity: ['trays'],
  holding_capacity: ['items', 'trays', 'L'],
  transactions_per_hour: ['transactions/hour'],
  power_load: ['W', 'kW'],
  cleaning_time: ['minutes', 'hours'],
  service_access: ['description'],
  assembly_time: ['minutes', 'hours'],
  transport_volume: ['m3'],
  capex: ['ZAR', 'USD', 'GBP', 'EUR', 'AED'],
  bom_cost: ['ZAR', 'USD', 'GBP', 'EUR', 'AED'],
});
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const nonBlank = value => typeof value === 'string' && value.trim().length > 0;

function metricErrors(metric, entry) {
  if (!record(entry)) return ['must be a structured measurement'];
  const errors = [];
  if (!nonBlank(entry.source)) errors.push('source must identify the measurement record or document');
  if (!METRIC_UNITS[metric].includes(entry.unit)) errors.push(`unit must be one of: ${METRIC_UNITS[metric].join(', ')}`);
  if (metric === 'external_dimensions') {
    if (!record(entry.value) || !['width', 'depth', 'height'].every(key => positive(entry.value[key]))) {
      errors.push('value must contain positive finite width, depth and height');
    }
  } else if (metric === 'service_access') {
    if (!nonBlank(entry.value)) errors.push('value must describe the service access arrangement');
  } else if (!positive(entry.value)) {
    errors.push('value must be a positive finite number');
  } else if (['trays', 'items'].includes(entry.unit) && !Number.isSafeInteger(entry.value)) {
    errors.push('count must be a positive safe integer');
  }
  return errors;
}

function evidenceGate(proposal = {}) {
  const evidence = record(proposal) && record(proposal.evidence) ? proposal.evidence : {};
  const missing = REQUIRED_METRICS.filter(metric => !Object.hasOwn(evidence, metric) || evidence[metric] == null);
  const invalid = REQUIRED_METRICS.filter(metric => !missing.includes(metric)).flatMap(metric => {
    const reasons = metricErrors(metric, evidence[metric]);
    return reasons.length ? [{ metric, reasons }] : [];
  });
  return { passed: missing.length === 0 && invalid.length === 0, missing, invalid };
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

module.exports = { COUNCIL, REQUIRED_METRICS, METRIC_UNITS, evidenceGate, reviewPhysicalProposal };
