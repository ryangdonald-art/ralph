'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {ControlledWorkflow} = require('../src/services/controlledWorkflow');
const {syntheticScenario, analyseScenario, approveAndExecute, persistSyntheticLoop} = require('../src/services/cashFlowLoop');

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ralph-loop-'));
  t.after(() => fs.rm(dir, {recursive:true, force:true}));
  const filePath = path.join(dir, 'state.json');
  return {filePath, workflow:new ControlledWorkflow({filePath})};
}
const detect = (w, id='one') => w.detect({caseId:id, input:syntheticScenario(), sourceRef:'synthetic-fixture-v1'});
async function completed(w) {
  await detect(w);
  await w.approve({caseId:'one', actor:'fixture-approver', note:'Synthetic approval only'});
  await w.execute({caseId:'one'});
  return w.complete({caseId:'one', actor:'fixture-operator', evidenceRef:'synthetic-bank-check', observedGap:150000});
}

test('legacy execution fails closed before any repository calls', async()=>{
  const repo = new Proxy({}, {get(){throw new Error('Repository must not be used');}});
  await assert.rejects(approveAndExecute({repo}), error => error.status === 503 && /atomic approval/.test(error.message));
});
test('synthetic preparation fails closed without reading or writing the repository', async()=>{
  let accesses=0;
  const repo=new Proxy({}, {get(){accesses++;throw new Error('Repository must not be used');}});
  await assert.rejects(persistSyntheticLoop({repo,userId:'fixture'}), error=>error.status===503 && /preparation is paused/.test(error.message));
  assert.equal(accesses,0);
});
test('deterministic review has no fabricated confidence', ()=>{
  const result=analyseScenario(syntheticScenario());
  assert.equal(result.sherlock.confidence,null);
  assert.equal(result.rat.revisedConfidence,null);
  assert.equal(result.ralph.confidence,null);
  assert.equal(result.ralph.reviewMethod,'DETERMINISTIC_TEMPLATE');
});
test('task cannot execute or complete without explicit preceding stages', async t=>{
  const {workflow:w}=await fixture(t); await detect(w);
  await assert.rejects(w.execute({caseId:'one'}), /approval required/);
  await assert.rejects(w.complete({caseId:'one',actor:'fixture',evidenceRef:'fixture',observedGap:1}), /open task/);
});
test('same case replays without duplicate evidence and conflicting evidence fails', async t=>{
  const {workflow:w}=await fixture(t); await detect(w); await detect(w);
  await assert.rejects(w.detect({caseId:'one',input:{...syntheticScenario(),cashInBank:0},sourceRef:'synthetic-fixture-v1'}), /Idempotency conflict/);
  const state=await w.snapshot(); assert.equal(state.cases.length,1); assert.equal(state.events.length,1);
});
test('simultaneous writers cannot create duplicate tasks; busy command can replay', async t=>{
  const {workflow:w,filePath}=await fixture(t); await detect(w);
  await w.approve({caseId:'one',actor:'fixture',note:'test approval'});
  const other=new ControlledWorkflow({filePath});
  const results=await Promise.allSettled([w.execute({caseId:'one'}), other.execute({caseId:'one'})]);
  assert.ok(results.some(result=>result.status==='fulfilled'));
  for(const result of results.filter(result=>result.status==='rejected')) assert.match(result.reason.message,/WORKFLOW_BUSY/);
  const replay=await other.execute({caseId:'one'});
  const state=await w.snapshot(); assert.equal(state.events.filter(e=>e.type==='LOCAL_TASK_CREATED').length,1);
  assert.equal(replay.task.id,state.cases[0].task.id); assert.equal(replay.outcome,undefined);
});
test('failure before commit leaves state unchanged and permits retry', async t=>{
  const {workflow:w,filePath}=await fixture(t); await detect(w);
  await w.approve({caseId:'one',actor:'fixture',note:'test approval'});
  const before=await fs.readFile(filePath,'utf8');
  const failing=new ControlledWorkflow({filePath,beforeCommit(){throw new Error('INJECTED_FAILURE');}});
  await assert.rejects(failing.execute({caseId:'one'}),/INJECTED_FAILURE/);
  assert.equal(await fs.readFile(filePath,'utf8'),before);
  assert.equal((await w.execute({caseId:'one'})).task.status,'OPEN');
});
test('completion records synthetic observation once and rejects conflicting replay', async t=>{
  const {workflow:w}=await fixture(t); await completed(w);
  await w.complete({caseId:'one',actor:'fixture-operator',evidenceRef:'synthetic-bank-check',observedGap:150000});
  await assert.rejects(w.complete({caseId:'one',actor:'fixture',evidenceRef:'other',observedGap:0}),/Completion conflict/);
  const state=await w.snapshot(); assert.equal(state.events.filter(e=>e.type==='SIMULATED_TASK_COMPLETED_AND_OUTCOME_RECORDED').length,1);
  assert.equal(state.cases[0].outcome.realWorldVerified,false);
});
test('only reviewed lesson affects later task wording; permission and detection unchanged', async t=>{
  const {workflow:w,filePath}=await fixture(t); await completed(w);
  const lesson=await w.proposeLesson({caseId:'one',actor:'fixture-operator',reason:'Verification needs timestamped inputs'});
  const before=await detect(w,'two'); assert.equal(before.appliedLesson,null);
  await assert.rejects(w.reviewLesson({lessonId:lesson.id,actor:'fixture-operator',approved:true,reason:'self'}),/different fixture reviewer/);
  await w.reviewLesson({lessonId:lesson.id,actor:'fixture-reviewer',approved:true,reason:'Evidence requirement is useful'});
  // Fresh OS process reads persisted lesson and creates a later decision.
  const modulePath=path.resolve(__dirname,'../src/services/controlledWorkflow.js');
  const cashPath=path.resolve(__dirname,'../src/services/cashFlowLoop.js');
  const script=`const {ControlledWorkflow}=require(process.argv[1]); const {syntheticScenario}=require(process.argv[2]); new ControlledWorkflow({filePath:process.argv[3]}).detect({caseId:'three',input:syntheticScenario(),sourceRef:'synthetic-fixture-v1'}).then(x=>process.stdout.write(JSON.stringify(x))).catch(e=>{console.error(e);process.exit(1)});`;
  const after=JSON.parse(execFileSync(process.execPath,['-e',script,modulePath,cashPath,filePath],{encoding:'utf8'}));
  assert.equal(after.appliedLesson.id,lesson.id);
  assert.match(after.analysis.ralph.summary,/timestamped bank balance/);
  assert.equal(after.analysis.ralph.permissionLevel,3);
  assert.equal(after.status,'AWAITING_APPROVAL');
  assert.deepEqual(after.analysis.detected,before.analysis.detected);
});
test('lesson needs outcome and rejected lesson does not change future decisions', async t=>{
  const {workflow:w}=await fixture(t); await detect(w);
  await assert.rejects(w.proposeLesson({caseId:'one',actor:'fixture',reason:'guess'}), /Recorded outcome/);
  await completed(w);
  const lesson=await w.proposeLesson({caseId:'one',actor:'fixture',reason:'test'});
  await w.reviewLesson({lessonId:lesson.id,actor:'reviewer',approved:false,reason:'not justified'});
  assert.equal((await detect(w,'two')).appliedLesson,null);
  await assert.rejects(w.reviewLesson({lessonId:lesson.id,actor:'reviewer',approved:true,reason:'change'}),/immutable/);
});
test('orphan lock fails closed and corrupt persisted state is not replaced',async t=>{
  const {workflow:w,filePath}=await fixture(t);
  await fs.writeFile(`${filePath}.lock`,'orphan');
  await assert.rejects(detect(w),/WORKFLOW_BUSY/);
  await fs.unlink(`${filePath}.lock`);
  await fs.writeFile(filePath,'invalid json');
  await assert.rejects(detect(w),SyntaxError);
  assert.equal(await fs.readFile(filePath,'utf8'),'invalid json');
});


test('valid JSON with malformed revision or broken workflow invariants fails closed', async t=>{
  const {workflow:w,filePath}=await fixture(t); await completed(w);
  const lesson=await w.proposeLesson({caseId:'one',actor:'fixture-operator',reason:'need timestamps'});
  await w.reviewLesson({lessonId:lesson.id,actor:'fixture-reviewer',approved:true,reason:'confirmed'});
  await detect(w,'later');
  const original=await w.snapshot();
  const corruptions=[
    state=>{delete state.revision;}, state=>{state.revision=null;},
    state=>{state.revision=-1;}, state=>{state.revision=Number.MAX_SAFE_INTEGER+1;},
    state=>{state.cases.push(state.cases[0]);},
    state=>{delete state.cases[0].approval;},
    state=>{state.cases[0].task.status='OPEN';},
    state=>{state.cases[0].outcome.realWorldVerified=true;},
    state=>{state.cases[0].input.cashInBank=99999;},
    state=>{state.cases[0].analysis.ralph.permissionLevel=4;},
    state=>{state.lessons[0].review.actor=state.lessons[0].proposer;},
    state=>{state.lessons[0].kind='DISABLE_APPROVAL';},
    state=>{state.lessons[0].caseId='missing';},
    state=>{state.cases[1].appliedLesson.version=999;},
    state=>{state.events.splice(1,1);},
    state=>{state.events[0].inputHash='wrong';}
  ];
  for(const corrupt of corruptions){
    const state=structuredClone(original); corrupt(state);
    const content=JSON.stringify(state); await fs.writeFile(filePath,content);
    await assert.rejects(w.execute({caseId:'one'}),/Invalid workflow state/);
    assert.equal(await fs.readFile(filePath,'utf8'),content);
  }
});
test('conflicting approval, completion, proposal and review replays are rejected', async t=>{
  const {workflow:w}=await fixture(t); await completed(w);
  await assert.rejects(w.approve({caseId:'one',actor:'other',note:'Synthetic approval only'}),/Approval conflict/);
  await assert.rejects(w.approve({caseId:'one',actor:'fixture-approver',note:'changed'}),/Approval conflict/);
  await assert.rejects(w.complete({caseId:'one',actor:'other',evidenceRef:'synthetic-bank-check',observedGap:150000}),/Completion conflict/);
  const args={caseId:'one',actor:'fixture-operator',reason:'need timestamps'};
  const lesson=await w.proposeLesson(args); assert.equal((await w.proposeLesson(args)).id,lesson.id);
  await assert.rejects(w.proposeLesson({...args,reason:'changed'}),/proposal conflict/);
  await assert.rejects(w.proposeLesson({...args,actor:'other'}),/proposal conflict/);
  const review={lessonId:lesson.id,actor:'fixture-reviewer',approved:true,reason:'confirmed'};
  await w.reviewLesson(review); await w.reviewLesson(review);
  await assert.rejects(w.reviewLesson({...review,reason:'changed'}),/immutable/);
  await assert.rejects(w.reviewLesson({...review,actor:'other'}),/immutable/);
});
