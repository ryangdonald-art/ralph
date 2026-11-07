'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createLocalRunLedger,createTrackedCouncil}=require('../src/intelligence/tracked-council');
const {route}=require('../src/intelligence/council-registry');
const evidence={text:'Documented statement',status:'verified',sources:[{id:'s1',title:'Original document',supports:true,independent:true}]};
const args=()=>({kind:'editorial',brief:'Investigate',configurations:Object.fromEntries(route('editorial').map(r=>[r,'v1'])),claims:[evidence],findings:[{role:'RAT',severity:'minor',disposition:'resolved'}]});
const mk=(overrides={})=>{
  let n=0;const ledger=createLocalRunLedger();
  const runner={run:async ({role})=>({role,status:'completed',runId:'provider-'+role})};
  return {ledger,workflow:createTrackedCouncil({runner,ledger,verifyProviderRun:async()=>true,idFactory:()=>String(++n),clock:()=> '2026-11-07T17:00:00Z',...overrides})};
};
test('records every required role and returns review ready but not approved',async()=>{
  const {workflow,ledger}=mk();const result=await workflow.evaluate(args());
  assert.equal(result.decision,'REVIEW_READY');assert.equal(result.approvalGranted,false);assert.equal(ledger.list().length,route('editorial').length);
});
test('missing specialist configuration blocks',async()=>{
  const {workflow}=mk();const a=args();delete a.configurations.RENEE;
  assert.equal((await workflow.evaluate(a)).decision,'BLOCKED');
});
test('provider self-claim is insufficient without verifier',async()=>{
  const {workflow}=mk({verifyProviderRun:async()=>false});
  const result=await workflow.evaluate(args());assert.equal(result.decision,'BLOCKED');assert(result.runs.every(r=>r.status==='unverified_execution'));
});
test('adapter error blocks and does not leak error',async()=>{
  const {workflow}=mk({runner:{run:async()=>{throw Error('sensitive-secret')}}});
  const result=await workflow.evaluate(args());assert.equal(result.decision,'BLOCKED');assert(!JSON.stringify(result).includes('sensitive-secret'));
});
test('critical objection blocks even with verified executions',async()=>{
  const {workflow}=mk();const a=args();a.findings=[{role:'RAT',severity:'critical',disposition:'open'}];
  assert.equal((await workflow.evaluate(a)).decision,'BLOCKED');
});
test('evidence defect blocks even with verified executions',async()=>{
  const {workflow}=mk();const a=args();a.claims=[{text:'Unsupported',status:'verified',sources:[]}];
  assert.equal((await workflow.evaluate(a)).decision,'BLOCKED');
});
test('ledger refuses duplicate run IDs',()=>{const ledger=createLocalRunLedger();ledger.append({runId:'same'});assert.throws(()=>ledger.append({runId:'same'}))});
test('ledger exposes snapshots, not mutable internal array',()=>{const ledger=createLocalRunLedger();ledger.append({runId:'r1',status:'ok'});const items=ledger.list();items[0].status='altered';assert.equal(ledger.list()[0].status,'ok')});
test('ledger append failure prevents successful result',async()=>{
  const {workflow}=mk({ledger:{append:()=>{throw Error('disk unavailable')}}});
  await assert.rejects(()=>workflow.evaluate(args()),/disk unavailable/);
});
test('verifier required',()=>assert.throws(()=>createTrackedCouncil({runner:{run:async()=>{}},ledger:createLocalRunLedger()})));
test('invalid task kind rejected',async()=>{const {workflow}=mk();await assert.rejects(()=>workflow.evaluate({...args(),kind:'unknown'}))});
test('invalid verifier result does not establish independent execution',async()=>{
  const {workflow}=mk({verifyProviderRun:async()=>({verified:true})});
  assert.equal((await workflow.evaluate(args())).decision,'BLOCKED');
});

test('malformed evidence is rejected before any adapter execution',async()=>{
  let called=0;
  const {workflow}=mk({runner:{run:async()=>{called++;return {role:'RENEE',status:'completed',runId:'p1'};}}});
  const a=args();a.claims=[{text:'Invalid',status:'unknown',sources:[]}];
  await assert.rejects(()=>workflow.evaluate(a),/Invalid evidence status/);
  assert.equal(called,0);
});
test('missing findings rejected before adapter execution',async()=>{
  let called=0;
  const {workflow}=mk({runner:{run:async()=>{called++;return {};}}});
  const a=args();delete a.findings;
  await assert.rejects(()=>workflow.evaluate(a),/Claims, findings and attestations arrays required/);
  assert.equal(called,0);
});
