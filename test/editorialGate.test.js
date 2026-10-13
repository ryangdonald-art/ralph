const test=require('node:test');
const assert=require('node:assert/strict');
const {editorialGate,digest,REVIEWERS}=require('../src/services/editorialGate');
const text='A DIFFERENT START.\n\nCustomers returned for the coffee.';
function packet(){return {text,factLedger:[{id:'f1',claim:'Customers returned for coffee.',status:'ATTRIBUTED',sourceRefs:['synthetic-interview-1'],disclosure:'Attributed to synthetic interview.'}],hospitality:true,experienceEvidenceRefs:['f1'],reviews:REVIEWERS.map(role=>({role,textHash:digest(text),executionMode:'SINGLE_MODEL_PERSPECTIVE',verdict:'PASS',finding:`Synthetic ${role} test finding`,resolution:'Synthetic test resolution, not a real review.'}))};}
test('counts exact final copy and passes explicitly supplied synthetic attestations',()=>{
 const result=editorialGate(packet());assert.equal(result.characters,text.length);assert.equal(result.status,'CHECKS_PASSED');assert.match(result.limitation,/not proof/);
});
test('substantive edit invalidates all stale review attestations',()=>{
 const input=packet();input.text+=' Another claim.';
 assert.equal(editorialGate(input).issues.filter(x=>x.startsWith('STALE_REVIEW')).length,4);
});
test('blocks unresolved material claims, missing experience and recycled hook',()=>{
 const input=packet();input.factLedger[0].status='UNRESOLVED';input.previousHooks=[' A different start. '];
 const issues=editorialGate(input).issues;
 assert.ok(issues.includes('UNRESOLVED_FACT:f1'));assert.ok(issues.includes('CUSTOMER_EXPERIENCE_EVIDENCE_REQUIRED'));assert.ok(issues.includes('RECYCLED_HOOK'));
});
test('over-limit and missing review cannot be papered over by a score',()=>{
 const input=packet();input.characterLimit=10;input.reviews.pop();input.score=10;
 const issues=editorialGate(input).issues;assert.ok(issues.includes('CHARACTER_LIMIT'));assert.ok(issues.includes('REVIEW_REQUIRED:COUNCIL'));
});
test('personal brief exception is explicit rather than a permanent rule change',()=>{
 const input=packet();input.text='My Sunday';
 assert.ok(editorialGate(input).issues.includes('FIRST_PERSON_REQUIRES_BRIEF'));
 input.firstPersonAllowed=true;assert.ok(!editorialGate(input).issues.includes('FIRST_PERSON_REQUIRES_BRIEF'));
});
