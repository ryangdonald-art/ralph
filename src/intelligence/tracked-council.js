'use strict';
const crypto=require('node:crypto');
const {route}=require('./council-registry');
const {evaluateCouncilPackage}=require('./council-evidence-gate');

/**
 * Append-only local test ledger. This is NOT a production audit store:
 * no authentication, durability, transactional isolation or tamper-proof guarantees.
 */
function createLocalRunLedger(){
  const events=[];
  const ids=new Set();
  return Object.freeze({
    append(event){
      if(!event||typeof event!=='object'||typeof event.runId!=='string'||!event.runId.trim())throw new Error('Run ID required');
      if(ids.has(event.runId))throw new Error('Duplicate run ID');
      const snapshot=Object.freeze({...event});
      ids.add(event.runId);events.push(snapshot);return snapshot;
    },
    list(){return events.map(e=>({...e}));}
  });
}
function createTrackedCouncil({runner,ledger,verifyProviderRun,clock=()=>new Date().toISOString(),idFactory=()=>crypto.randomUUID()}={}){
  if(!runner||typeof runner.run!=='function')throw new Error('Runner required');
  if(!ledger||typeof ledger.append!=='function')throw new Error('Ledger required');
  if(typeof verifyProviderRun!=='function')throw new Error('Independent provider verifier required');
  if(typeof clock!=='function'||typeof idFactory!=='function')throw new Error('Clock and ID factory required');
  return {async evaluate({kind,brief,configurations,claims,findings,risk='ordinary'}={}){
    if(typeof brief!=='string'||!brief.trim())throw new Error('Brief required');
    if(!configurations||typeof configurations!=='object'||Array.isArray(configurations))throw new Error('Configurations required');
    const selected=route(kind,risk);
    const runs=[];
    for(const role of selected){
      const runId=idFactory();
      if(typeof runId!=='string'||!runId.trim())throw new Error('Invalid run ID');
      const version=configurations[role];
      const startedAt=clock();
      let status='not_configured',errorCode=null,providerExecutionVerified=false;
      if(typeof version==='string'&&version.trim()){
        try{
          const result=await runner.run({kind,role,brief,configurationVersion:version});
          if(result&&result.role===role&&result.status==='completed'&&result.runId&&await verifyProviderRun({result,role,configurationVersion:version})===true){
            status='completed';providerExecutionVerified=true;
          }else if(result&&result.role===role&&result.status==='completed'){
            status='unverified_execution';errorCode='PROVIDER_NOT_ATTESTED';
          }else{status='failed';errorCode='RUN_FAILED';}
        }catch(_){status='failed';errorCode='RUN_FAILED';}
      }
      const event=Object.freeze({runId,role,kind,configurationVersion:typeof version==='string'?version:null,startedAt,completedAt:clock(),status,providerExecutionVerified,errorCode});
      // Failure to record a run must stop evaluation; never present a successful unrecorded review.
      ledger.append(event);
      runs.push(event);
    }
    const gate=evaluateCouncilPackage({claims,findings,attestations:[]});
    const complete=runs.length===selected.length&&runs.every(r=>r.status==='completed'&&r.providerExecutionVerified);
    return Object.freeze({decision:complete?gate.decision:'BLOCKED',approvalGranted:false,reason:complete?gate.reason:'SPECIALIST_INCOMPLETE',runs,gate});
  }};
}
module.exports={createLocalRunLedger,createTrackedCouncil};
