'use strict';
const { auditDossier } = require('./evidence-auditor');
const { councilDecision, verifyAttestation } = require('./council-registry');

/** A deterministic pre-approval gate. This does not execute models or verify source truth. */
function evaluateCouncilPackage(input) {
  if (!input || typeof input !== 'object') throw new Error('Council package required');
  if (!Array.isArray(input.claims) || !Array.isArray(input.findings) || !Array.isArray(input.attestations)) throw new Error('Claims, findings and attestations arrays required');
  const evidence = auditDossier(input.claims);
  const reviewed = input.attestations.map(a => {
    verifyAttestation(a);
    return Object.freeze({role:a.role,runId:a.runId || null,independent:a.independent===true});
  });
  const council = input.findings.length ? councilDecision(input.findings) : 'NO_COUNCIL_REVIEW';
  const hasCriticalEvidence = !evidence.pass;
  const decision = hasCriticalEvidence ? 'BLOCKED' : council === 'BLOCKED' ? 'BLOCKED' : council === 'REVISE' ? 'REVISE' : council === 'NO_COUNCIL_REVIEW' ? 'REVISE' : 'REVIEW_READY';
  return Object.freeze({decision,evidence,reviewed,council,approvalGranted:false,reason:hasCriticalEvidence?'EVIDENCE_DEFECT':council});
}
module.exports={evaluateCouncilPackage};
