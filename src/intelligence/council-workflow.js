'use strict';
const {route}=require('./council-registry');
const {evaluateCouncilPackage}=require('./council-evidence-gate');
/** In-memory, nonproduction orchestration. No model calls, persistence, or approval. */
function createCouncilWorkflow({runner, record}={}) {
  if (!runner || typeof runner.run !== 'function') throw new Error('Runner required');
  if (typeof record !== 'function') throw new Error('Record callback required');
  return {async evaluate({kind,brief,configurations,claims,findings,risk='ordinary'}) {
    if (typeof brief !== 'string' || !brief.trim()) throw new Error('Brief required');
    if (!configurations || typeof configurations !== 'object' || Array.isArray(configurations)) throw new Error('Configurations required');
    const selected=route(kind,risk);
    const runs=[];
    for (const role of selected) {
      const version=configurations[role];
      if (typeof version !== 'string' || !version.trim()) {
        runs.push({role,status:'not_configured'});
        continue;
      }
      let result;
      try { result=await runner.run({kind,role,brief,configurationVersion:version}); }
      catch (_) { result={role,status:'failed',errorCode:'RUNNER_FAILED'}; }
      if (!result || result.role!==role || !['completed','failed'].includes(result.status)) result={role,status:'failed',errorCode:'INVALID_RUN_RESULT'};
      runs.push(result);
      await record({role,kind,status:result.status,runId:result.runId||null,configurationVersion:version});
    }
    const gate=evaluateCouncilPackage({claims,findings,attestations:[]});
    const complete=runs.length===selected.length && runs.every(x=>x.status==='completed');
    return Object.freeze({decision:complete?gate.decision:'BLOCKED',approvalGranted:false,reason:complete?gate.reason:'SPECIALIST_INCOMPLETE',selected,runs,gate});
  }};
}
module.exports={createCouncilWorkflow};
