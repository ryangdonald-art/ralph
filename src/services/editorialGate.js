const { createHash } = require('node:crypto');
const REVIEWERS = Object.freeze(['RALPH','RAT','NONO','COUNCIL']);
const digest = text => createHash('sha256').update(text).digest('hex');

// Offline delivery checks. Evidence/reviews are human-supplied attestations,
// not automatic fact verification, voice judgment or a quality score.
function editorialGate({text, factLedger=[], reviews=[], previousHooks=[], hospitality=false, experienceEvidenceRefs=[], firstPersonAllowed=false, characterLimit=3000}={}) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Final text is required');
  if (!Number.isInteger(characterLimit) || characterLimit < 1) throw new Error('Character limit must be a positive integer');
  const issues=[];
  const textHash=digest(text);
  // Conservative UTF-16 count includes title, whitespace and paragraph breaks.
  const characters=text.length;
  const hook=text.split(/\r?\n/).find(line=>line.trim())?.trim() || '';
  const normalise=value=>value.trim().toLocaleLowerCase().replace(/\s+/g,' ');
  if(characters>characterLimit) issues.push('CHARACTER_LIMIT');
  if(previousHooks.some(value=>normalise(value)===normalise(hook))) issues.push('RECYCLED_HOOK');
  if(!firstPersonAllowed && /\b(?:I|me|my|mine|myself)\b/i.test(text)) issues.push('FIRST_PERSON_REQUIRES_BRIEF');
  if(!factLedger.length) issues.push('FACT_LEDGER_REQUIRED');
  const eligibleFacts=new Set();
  for(const fact of factLedger){
    if(!fact.id || !fact.claim?.trim() || !['VERIFIED','ATTRIBUTED','INFERENCE','UNRESOLVED'].includes(fact.status)) {
      issues.push('INVALID_FACT_RECORD');continue;
    }
    if(fact.material !== false && fact.status==='UNRESOLVED') issues.push(`UNRESOLVED_FACT:${fact.id}`);
    if(!Array.isArray(fact.sourceRefs) || !fact.sourceRefs.length || fact.sourceRefs.some(ref=>typeof ref!=='string'||!ref.trim())) issues.push(`SOURCE_REQUIRED:${fact.id}`);
    else if(['VERIFIED','ATTRIBUTED'].includes(fact.status)) eligibleFacts.add(fact.id);
    if(['ATTRIBUTED','INFERENCE'].includes(fact.status) && !fact.disclosure?.trim()) issues.push(`DISCLOSURE_REQUIRED:${fact.id}`);
  }
  if(hospitality && !experienceEvidenceRefs.some(ref=>eligibleFacts.has(ref))) issues.push('CUSTOMER_EXPERIENCE_EVIDENCE_REQUIRED');
  for(const role of REVIEWERS){
    const matching=reviews.filter(review=>review.role===role);
    if(matching.length!==1){issues.push(`REVIEW_REQUIRED:${role}`);continue;}
    const review=matching[0];
    if(review.textHash!==textHash) issues.push(`STALE_REVIEW:${role}`);
    if(!['SINGLE_MODEL_PERSPECTIVE','SEPARATE_RUN','HUMAN'].includes(review.executionMode)) issues.push(`REVIEW_MODE_REQUIRED:${role}`);
    if(!review.finding?.trim() || !review.resolution?.trim()) issues.push(`REVIEW_DETAIL_REQUIRED:${role}`);
    if(review.verdict!=='PASS') issues.push(`REVIEW_NOT_PASSED:${role}`);
  }
  return {status:issues.length?'REVISE':'CHECKS_PASSED',characters,characterLimit,textHash,issues,
    limitation:'Mechanical checks and supplied attestations only; not proof of factual truth, originality, human voice or publication readiness.'};
}
module.exports={editorialGate,digest,REVIEWERS};
