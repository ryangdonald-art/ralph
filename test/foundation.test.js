const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { detectCashFlowDanger } = require('../src/detectors/cashFlowDanger');
const { economicImpact, canExecute, PERMISSION_LEVELS, validateRalphOutput } = require('../src/domain/contracts');
const { validateSherlockFinding, validateRatChallenge } = require('../src/agents/contracts');
const { ExecutionGuard } = require('../src/services/executionGuard');
const { validateDeal } = require('../src/security/validateDeal');
const { loadMembership } = require('../src/security/requireAuthorization');
const { JsonRepository } = require('../src/repositories/jsonRepository');
const { AppError } = require('../src/domain/errors');

const base = { asOf:'2026-09-16', cashInBank:1000, receipts:[], committedPayments:[], forecastPayments:[], productionRequirements:[] };
const r=(id,amount,dueDate,status='OPEN')=>({id,amount,dueDate,status});
const p=(id,amount,status)=>({id,amount,...(status ? {status} : {})});

async function withMockFetch(response, fn) {
  const original = global.fetch;
  global.fetch = async () => response;
  try { return await fn(); } finally { global.fetch = original; }
}

function membershipResponse(rows, ok = true) {
  return { ok, json: async () => rows };
}

const authzReq = () => ({ identity:{ id:'user-1' }, accessToken:'synthetic-token' });

test('normal liquidity emits no signal',()=>assert.equal(detectCashFlowDanger({...base,committedPayments:[p('p1',500)]}).signal,null));
test('short-term committed deficit emits signal',()=>assert.equal(detectCashFlowDanger({...base,committedPayments:[p('p1',1500)]}).signal.exposure,500));
test('large future receivable is not available cash or overdue',()=>{const x=detectCashFlowDanger({...base,receipts:[r('r1',10000,'2026-09-30')],committedPayments:[p('p1',1500)]}); assert.equal(x.metrics.receiptsOverdue,0); assert.equal(x.metrics.availableLiquidity,1000); assert.equal(x.signal.exposure,500);});
test('genuinely overdue receivable is classified but not treated as cash',()=>{const x=detectCashFlowDanger({...base,receipts:[r('r1',800,'2026-09-01')]}); assert.equal(x.metrics.receiptsOverdue,800); assert.equal(x.metrics.availableLiquidity,1000);});
test('unpaid receipt due today cannot suppress the liquidity warning',()=>{const x=detectCashFlowDanger({...base,cashInBank:0,receipts:[r('r1',100000,'2026-09-16')],committedPayments:[p('p1',100000)]}); assert.equal(x.metrics.receiptsDue,100000); assert.equal(x.metrics.availableLiquidity,0); assert.equal(x.signal.exposure,100000);});
test('paid receipts are not added twice to bank cash',()=>{const x=detectCashFlowDanger({...base,receipts:[r('r1',1000,'2026-09-16','PAID')]}); assert.equal(x.metrics.expectedReceipts,0); assert.equal(x.metrics.availableLiquidity,1000);});
test('same UTC calendar day remains due at midday',()=>{const x=detectCashFlowDanger({...base,asOf:'2026-09-16T12:45:00Z',receipts:[r('r1',300,'2026-09-16')]}); assert.equal(x.metrics.receiptsDue,300); assert.equal(x.metrics.receiptsOverdue,0);});
test('timezone-qualified receipt is classified by UTC calendar day',()=>{const x=detectCashFlowDanger({...base,receipts:[r('r1',300,'2026-09-17T01:00:00+02:00')]}); assert.equal(x.metrics.receiptsDue,300);});
test('invalid and ambiguous asOf dates are rejected',()=>{for (const asOf of [null,undefined,0,'2026-02-30','09/16/2026','2026-09-16T12:00:00']) assert.throws(()=>detectCashFlowDanger({...base,asOf}),/asOf/);});
test('invalid receipt dates remain unknown rather than silently rolling over',()=>{const x=detectCashFlowDanger({...base,receipts:[r('r1',300,'2026-02-30'),r('r2',200,'09/16/2026')]}); assert.equal(x.metrics.receiptsUnknownDate,500); assert.equal(x.metrics.receiptsOverdue,0);});
test('committed production requirement affects liquidity',()=>assert.equal(detectCashFlowDanger({...base,productionRequirements:[p('prod1',1400,'COMMITTED')]}).signal.exposure,400));
test('forecast production requirement does not become committed',()=>assert.equal(detectCashFlowDanger({...base,productionRequirements:[p('prod1',1400,'FORECAST')]}).signal,null));
test('unknown production commitment remains unknown and does not become committed',()=>{const x=detectCashFlowDanger({...base,productionRequirements:[p('prod1',1400)]}); assert.equal(x.signal,null); assert.equal(x.metrics.unknownProductionRequirements,1400);});
test('forecast payment does not become committed payment',()=>assert.equal(detectCashFlowDanger({...base,forecastPayments:[p('f1',5000)]}).signal,null));
test('missing receipt date remains unknown',()=>assert.equal(detectCashFlowDanger({...base,receipts:[r('r1',700,null)]}).metrics.receiptsUnknownDate,700));
test('duplicate liability id is counted once',()=>assert.equal(detectCashFlowDanger({...base,committedPayments:[p('p1',700),p('p1',700)]}).metrics.committedPayments,700));
test('conflicting duplicate liabilities fail closed in either order',()=>{
  for (const committedPayments of [[p('p1',10),p('p1',100000)],[p('p1',100000),p('p1',10)]]) {
    assert.throws(()=>detectCashFlowDanger({...base,committedPayments}),/conflicting duplicate id/);
  }
});
test('conflicting duplicate receipt status date and currency cannot be silently discarded',()=>{
  const first=r('r1',1000,'2026-09-16');
  for (const patch of [{status:'PAID'},{dueDate:'2026-09-17'},{currency:'USD'},{amount:2000}]) {
    assert.throws(()=>detectCashFlowDanger({...base,receipts:[first,{...first,...patch}]}),/conflicting duplicate id/);
  }
});
test('conflicting duplicate production status cannot conceal a commitment',()=>{
  assert.throws(()=>detectCashFlowDanger({...base,productionRequirements:[p('prod1',100000,'FORECAST'),p('prod1',100000,'COMMITTED')]}),/conflicting duplicate id/);
});
test('exact duplicate receipts and production requirements remain idempotent',()=>{
  const receipt=r('r1',300,'2026-09-16'); const production=p('prod1',1500,'COMMITTED');
  const result=detectCashFlowDanger({...base,receipts:[receipt,{...receipt}],productionRequirements:[production,{...production}]});
  assert.equal(result.metrics.expectedReceipts,300); assert.equal(result.signal.exposure,500);
});
test('negative nonfinite and nonnumeric materiality thresholds are rejected',()=>{
  for (const materialityThreshold of [-1,NaN,Infinity,'100']) assert.throws(()=>detectCashFlowDanger(base,{materialityThreshold}),/materialityThreshold/);
});
test('revenue/profit fields cannot inflate liquidity',()=>assert.equal(detectCashFlowDanger({...base,revenue:100000,profit:50000,committedPayments:[p('p1',2000)]}).signal.exposure,1000));
test('materiality threshold suppresses immaterial gap',()=>assert.equal(detectCashFlowDanger({...base,committedPayments:[p('p1',1050)]},{materialityThreshold:100}).signal,null));
test('economic impact state is explicit',()=>assert.deepEqual(economicImpact({amount:100}),{amount:100,currency:'ZAR',state:'ESTIMATED'}));
test('invalid economic state is rejected',()=>assert.throws(()=>economicImpact({amount:1,state:'REALISH'})));
test('Level 4 execution is blocked in V1',()=>assert.equal(canExecute({permissionLevel:PERMISSION_LEVELS.AUTONOMOUS,approved:true,actionType:'LOW_RISK'}),false));
test('Level 3 requires approval',()=>assert.equal(canExecute({permissionLevel:PERMISSION_LEVELS.EXECUTE_WITH_APPROVAL,approved:false,actionType:'LOW_RISK'}),false));
test('RALPH output type is constrained',()=>assert.throws(()=>validateRalphOutput({type:'SUGGESTION',summary:'x'})));
test('Sherlock supports insufficient evidence',()=>assert.equal(validateSherlockFinding({status:'INSUFFICIENT EVIDENCE'}).status,'INSUFFICIENT EVIDENCE'));
test('RAT challenge requires falsification evidence field',()=>assert.throws(()=>validateRatChallenge({challenges:[]})));
test('idempotency prevents duplicate execution',()=>{const g=new ExecutionGuard(); const a={id:'a1',idempotencyKey:'k1',permissionLevel:3,actionType:'LOW_RISK',approvalStatus:'APPROVED',approver:'human',approvalTimestamp:'2026-09-16T12:00:00Z'}; let calls=0; g.execute(a,()=>++calls); const second=g.execute(a,()=>++calls); assert.equal(calls,1); assert.equal(second.duplicatePrevented,true);});
test('deal validation rejects malformed numeric value',()=>assert.throws(()=>validateDeal({company:'A',title:'B',value:'12x'})));
test('deal validation rejects silent truncation',()=>assert.throws(()=>validateDeal({company:'A'.repeat(201),title:'B'})));
test('corrupt JSON is not silently converted to empty data',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ralph-')); fs.writeFileSync(path.join(dir,'x.json'),'{bad'); const repo=new JsonRepository({dataDir:dir,fileName:'x.json'}); assert.throws(()=>repo.list(),/Invalid JSON/); fs.rmSync(dir,{recursive:true,force:true});});
test('missing identity maps to 401 rather than internal error',()=>assert.equal(new AppError('AUTH_REQUIRED','authentication required').status,401));
test('invalid identity maps to 401 rather than internal error',()=>assert.equal(new AppError('AUTH_INVALID','invalid authentication').status,401));
test('auth outage fails closed',()=>assert.equal(new AppError('AUTH_UNAVAILABLE','authentication unavailable').status,503));
test('authorization source rejects ambiguous membership result sets',()=>{const source=fs.readFileSync(path.join(__dirname,'..','src','security','requireAuthorization.js'),'utf8'); assert.match(source,/!Array\.isArray\(rows\) \|\| rows\.length !== 1/);});
test('authorization accepts one active known-role membership for the authenticated identity', async()=>withMockFetch(membershipResponse([{user_id:'user-1',organization_key:'synthetic',role:'VIEWER',active:true}]), async()=>assert.equal((await loadMembership(authzReq())).role,'VIEWER')));
test('authorization rejects duplicate membership rows', async()=>withMockFetch(membershipResponse([{user_id:'user-1',organization_key:'a',role:'VIEWER',active:true},{user_id:'user-1',organization_key:'b',role:'ADMIN',active:true}]), async()=>assert.rejects(loadMembership(authzReq()), error=>error.code==='AUTHZ_DENIED' && error.status===403)));
test('authorization rejects inactive membership', async()=>withMockFetch(membershipResponse([{user_id:'user-1',organization_key:'synthetic',role:'ADMIN',active:false}]), async()=>assert.rejects(loadMembership(authzReq()), error=>error.code==='AUTHZ_DENIED' && error.status===403)));
test('authorization rejects unknown role', async()=>withMockFetch(membershipResponse([{user_id:'user-1',organization_key:'synthetic',role:'OWNER',active:true}]), async()=>assert.rejects(loadMembership(authzReq()), error=>error.code==='AUTHZ_DENIED' && error.status===403)));
test('authorization rejects identity mismatch even if membership row is returned', async()=>withMockFetch(membershipResponse([{user_id:'attacker',organization_key:'synthetic',role:'ADMIN',active:true}]), async()=>assert.rejects(loadMembership(authzReq()), error=>error.code==='AUTHZ_DENIED' && error.status===403)));
test('authorization rejects upstream non-success responses', async()=>withMockFetch(membershipResponse([], false), async()=>assert.rejects(loadMembership(authzReq()), error=>error.code==='AUTHZ_DENIED' && error.status===403)));
test('browser source contains no server/service-role credential name',()=>{const source=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8'); assert.equal(/service[_-]?role|server[_-]?key|sb_secret_/i.test(source),false);});
