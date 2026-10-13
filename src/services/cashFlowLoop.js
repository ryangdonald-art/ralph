const { AppError }=require('../domain/errors');
const { detectCashFlowDanger }=require('../detectors/cashFlowDanger');

function syntheticScenario(){
  return {asOf:'2026-09-23',currency:'ZAR',cashInBank:100000,receipts:[],committedPayments:[{id:'supplier-1',amount:180000,status:'COMMITTED'}],forecastPayments:[],productionRequirements:[{id:'production-1',amount:70000,status:'COMMITTED'}]};
}
function analyseScenario(input){
  const detected=detectCashFlowDanger(input,{materialityThreshold:25000});
  if(!detected.signal) return {detected, sherlock:null, rat:null, ralph:null};
  const exposure=detected.signal.exposure;
  const sherlock={status:'COMPLETE',anomaly:`Committed near-term requirements exceed available liquidity by R${exposure.toLocaleString('en-ZA')}`,baseline:'Available liquidity should cover explicitly committed near-term requirements.',materiality:'MATERIAL',supportingEvidence:['cashInBank','committedPayments','committedProductionRequirements'],contradictoryEvidence:[],hypotheses:['Timing mismatch between cash availability and committed outflows.'],missingInformation:['No future or overdue receivable is treated as cash.'],economicExposure:exposure,confidence:null,reviewMethod:'DETERMINISTIC_TEMPLATE'};
  const rat={challenges:['Do not assume forecast or overdue receipts are available cash.'],contradictoryEvidence:[],missingEvidence:['Bank balance and payment timing should be refreshed before a real-world action.'],alternativeHypotheses:['A committed payment may be reschedulable, but this is not assumed.'],risk:'Acting on stale liquidity data could create a false alarm.',revisedConfidence:null,reviewMethod:'DETERMINISTIC_TEMPLATE',falsificationEvidence:['Verified available liquidity at or above committed requirement would falsify the alert.']};
  const ralph={type:'TASK',summary:'Verify bank liquidity and committed payment timing before releasing the next cash commitment.',rationale:`Synthetic test shows a R${exposure.toLocaleString('en-ZA')} liquidity gap. No payment, contract or external communication is authorised.`,confidence:null,reviewMethod:'DETERMINISTIC_TEMPLATE',permissionLevel:3,actionType:'REQUEST_INFO'};
  return {detected,sherlock,rat,ralph};
}
// Recovered database grants deliberately deny authenticated agent_runs INSERT.
// Separate preparation writes would leave five committed rows before that denial.
// Resume only through a verified atomic command; never bypass RLS with a client key.
async function persistSyntheticLoop(){
  throw new AppError('STORAGE_UNAVAILABLE', 'Synthetic preparation is paused: atomic evidence, decision and agent-run persistence has not been established. No preparation records were written.');
}
// Separate REST writes cannot guarantee exactly-once approval and execution.
// Keep this route fail-closed until an authenticated transactional command exists.
async function approveAndExecute(){
  throw new AppError('STORAGE_UNAVAILABLE', 'Execution disabled: atomic approval, durable task completion and outcome verification have not been established. Use the explicitly synthetic local workflow for regression demonstrations.');
}
module.exports={syntheticScenario,analyseScenario,persistSyntheticLoop,approveAndExecute};