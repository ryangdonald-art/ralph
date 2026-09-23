const crypto=require('crypto');
const { detectCashFlowDanger }=require('../detectors/cashFlowDanger');

function syntheticScenario(){
  return {asOf:'2026-09-23',currency:'ZAR',cashInBank:100000,receipts:[],committedPayments:[{id:'supplier-1',amount:180000,status:'COMMITTED'}],forecastPayments:[],productionRequirements:[{id:'production-1',amount:70000,status:'COMMITTED'}]};
}
function analyseScenario(input){
  const detected=detectCashFlowDanger(input,{materialityThreshold:25000});
  if(!detected.signal) return {detected, sherlock:null, rat:null, ralph:null};
  const exposure=detected.signal.exposure;
  const sherlock={status:'COMPLETE',anomaly:`Committed near-term requirements exceed available liquidity by R${exposure.toLocaleString('en-ZA')}`,baseline:'Available liquidity should cover explicitly committed near-term requirements.',materiality:'MATERIAL',supportingEvidence:['cashInBank','committedPayments','committedProductionRequirements'],contradictoryEvidence:[],hypotheses:['Timing mismatch between cash availability and committed outflows.'],missingInformation:['No future or overdue receivable is treated as cash.'],economicExposure:exposure,confidence:0.98};
  const rat={challenges:['Do not assume forecast or overdue receipts are available cash.'],contradictoryEvidence:[],missingEvidence:['Bank balance and payment timing should be refreshed before a real-world action.'],alternativeHypotheses:['A committed payment may be reschedulable, but this is not assumed.'],risk:'Acting on stale liquidity data could create a false alarm.',revisedConfidence:0.94,falsificationEvidence:['Verified available liquidity at or above committed requirement would falsify the alert.']};
  const ralph={type:'TASK',summary:'Verify bank liquidity and committed payment timing before releasing the next cash commitment.',rationale:`Synthetic test shows a R${exposure.toLocaleString('en-ZA')} liquidity gap. No payment, contract or external communication is authorised.`,confidence:0.94,permissionLevel:3,actionType:'REQUEST_INFO'};
  return {detected,sherlock,rat,ralph};
}
async function persistSyntheticLoop({repo,userId}){
  const input=syntheticScenario(), analysis=analyseScenario(input);
  if(!analysis.detected.signal) return {status:'NO_SIGNAL'};
  const signal=await repo.insert('signals',{signal_type:'CASH_FLOW_DANGER',status:'OPEN',severity:analysis.detected.signal.severity,summary:`Synthetic cash-flow danger: R${analysis.detected.signal.exposure} gap`,source_system:'RALPH_SYNTHETIC',source_ref:`synthetic-${Date.now()}`,provenance:{synthetic:true,detector:'cashFlowDanger-v1',input},created_by:userId});
  const evidence=await repo.insert('evidence',{signal_id:signal.id,evidence_type:'CALCULATED_INPUT',source_system:'RALPH_SYNTHETIC',source_ref:signal.source_ref,observed_at:new Date().toISOString(),payload:{input,metrics:analysis.detected.metrics},provenance:{synthetic:true},created_by:userId});
  const investigation=await repo.insert('investigations',{signal_id:signal.id,status:'COMPLETE',anomaly:analysis.sherlock.anomaly,baseline:analysis.sherlock.baseline,materiality:analysis.sherlock.materiality,supporting_evidence:[evidence.id],contradictory_evidence:analysis.sherlock.contradictoryEvidence,hypotheses:analysis.sherlock.hypotheses,missing_information:analysis.sherlock.missingInformation,economic_exposure:analysis.sherlock.economicExposure,currency:'ZAR',confidence:analysis.rat.revisedConfidence,provenance:{synthetic:true,sherlock:analysis.sherlock,rat:analysis.rat},created_by:userId});
  const decision=await repo.insert('decisions',{investigation_id:investigation.id,signal_id:signal.id,output_type:analysis.ralph.type,status:'PROPOSED',summary:analysis.ralph.summary,rationale:analysis.ralph.rationale,confidence:analysis.ralph.confidence,provenance:{synthetic:true,rat:analysis.rat},created_by:userId});
  const action=await repo.insert('actions',{decision_id:decision.id,action_type:analysis.ralph.actionType,requested_action:{kind:'REQUEST_INFO',text:'Refresh bank balance and committed payment timing.',synthetic:true},permission_level:3,status:'AWAITING_APPROVAL',idempotency_key:`synthetic:${crypto.randomUUID()}`,created_by:userId});
  await repo.insert('agent_runs',{agent:'SHERLOCK',provider:'DETERMINISTIC',model:'sherlock-contract-v1',signal_id:signal.id,investigation_id:investigation.id,input_refs:[evidence.id],output:analysis.sherlock,confidence:analysis.sherlock.confidence,completed_at:new Date().toISOString(),created_by:userId});
  await repo.insert('agent_runs',{agent:'RAT',provider:'DETERMINISTIC',model:'rat-contract-v1',signal_id:signal.id,investigation_id:investigation.id,decision_id:decision.id,input_refs:[investigation.id],output:analysis.rat,confidence:analysis.rat.revisedConfidence,completed_at:new Date().toISOString(),created_by:userId});
  await repo.insert('agent_runs',{agent:'RALPH',provider:'DETERMINISTIC',model:'ralph-contract-v1',signal_id:signal.id,investigation_id:investigation.id,decision_id:decision.id,input_refs:[investigation.id],output:analysis.ralph,confidence:analysis.ralph.confidence,completed_at:new Date().toISOString(),created_by:userId});
  return {status:'AWAITING_HUMAN_APPROVAL',signal,investigation,decision,action};
}
async function approveAndExecute({repo,userId,actionId}){
  const actions=await repo.list('actions',`id=eq.${encodeURIComponent(actionId)}&organization_key=eq.dealworx&select=*`);
  if(!Array.isArray(actions)||actions.length!==1) throw new Error('Action not found');
  const action=actions[0];
  if(action.permission_level>3) throw new Error('Autonomous execution is prohibited');
  if(action.status==='EXECUTED') return {action,duplicatePrevented:true};
  if(action.status!=='AWAITING_APPROVAL') throw new Error('Action is not awaiting approval');
  const approval=await repo.insert('approvals',{action_id:action.id,status:'APPROVED',approver_id:userId,approval_timestamp:new Date().toISOString(),notes:'Approved by authenticated human in RALPH.'});
  const executed=await repo.update('actions',action.id,{status:'EXECUTED',execution_result:{kind:'INTERNAL_TASK_CREATED',text:action.requested_action?.text||'Request information',executed_at:new Date().toISOString(),synthetic:true},updated_at:new Date().toISOString()});
  const outcome=await repo.insert('outcomes',{action_id:action.id,decision_id:action.decision_id,outcome_type:'SYNTHETIC_LOOP_COMPLETED',summary:'Approved internal request-for-information action executed once; outcome captured for learning.',economic_amount:0,currency:'ZAR',economic_state:'VERIFIED',evidence_refs:[approval.id],measured_at:new Date().toISOString(),provenance:{synthetic:true},created_by:userId});
  return {approval,action:executed,outcome,duplicatePrevented:false};
}
module.exports={syntheticScenario,analyseScenario,persistSyntheticLoop,approveAndExecute};