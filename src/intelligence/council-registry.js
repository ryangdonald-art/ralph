'use strict';
const roles=Object.freeze({
RALPH:{domain:'commercial',required:['commercial'],authority:'recommend'},
SHERLOCK:{domain:'investigation',required:['commercial','editorial'],authority:'investigate'},
RAT:{domain:'adversarial',required:['commercial','editorial'],authority:'challenge'},
BOB:{domain:'finance',required:['commercial'],authority:'challenge'},
RENEE:{domain:'editorial',required:['editorial'],authority:'investigate'},
PETALS:{domain:'human',required:['editorial'],authority:'review'},
NONO:{domain:'voice',required:['editorial'],authority:'review'},
EVIDENCE_AUDITOR:{domain:'verification',required:['commercial','editorial'],authority:'review'},
STORY_ARCHITECT:{domain:'narrative',required:['editorial'],authority:'draft'},
CREATIVE_DIRECTOR:{domain:'visual',required:['visual'],authority:'draft'},
VISUAL_QUALITY:{domain:'visual-review',required:['visual'],authority:'review'},
FORGE:{domain:'ergonomics',required:['physical'],authority:'review'},
FOUNDRY:{domain:'manufacturing',required:['physical'],authority:'review'},
GRID:{domain:'retail-space',required:['physical'],authority:'review'}
});
const validStatus=new Set(['proposed','documented','configured','tested','integrated','deployed','production_verified']);
function route(kind,risk='ordinary'){
if(!['commercial','editorial','visual','physical'].includes(kind))throw new Error('Unknown task kind');
const selected=Object.entries(roles).filter(([,r])=>r.required.includes(kind)).map(([name])=>name);
if(risk==='material'&&!selected.includes('RAT'))selected.push('RAT');
return Object.freeze(selected);
}
function verifyAttestation(a){
if(!a||typeof a!=='object')throw new Error('Missing attestation');
if(!roles[a.role])throw new Error('Unknown role');
if(!validStatus.has(a.status))throw new Error('Invalid status');
if(a.status==='production_verified'&&(!a.runId||!a.evidenceRefs?.length||!a.configurationVersion))throw new Error('Production claim requires run, configuration and evidence');
if(a.independent===true&&(!a.runId||!a.configurationVersion||!a.evidenceRefs?.length))throw new Error('Independent review requires traceable execution');
return true;
}
function councilDecision(findings){
if(!Array.isArray(findings)||!findings.length)throw new Error('Findings required');
for(const f of findings)if(!roles[f.role]||!['critical','major','minor'].includes(f.severity)||!['open','resolved','accepted'].includes(f.disposition))throw new Error('Invalid finding');
if(findings.some(f=>f.severity==='critical'&&f.disposition!=='resolved'))return 'BLOCKED';
if(findings.some(f=>f.severity==='major'&&f.disposition==='open'))return 'REVISE';
return 'REVIEW_READY';
}
module.exports={roles,route,verifyAttestation,councilDecision};
