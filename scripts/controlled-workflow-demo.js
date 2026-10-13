'use strict';
const path=require('node:path');
const {ControlledWorkflow,MODE}=require('../src/services/controlledWorkflow');
const {syntheticScenario}=require('../src/services/cashFlowLoop');

async function main(){
  if(!process.argv[2]) throw new Error('Usage: node scripts/controlled-workflow-demo.js /path/to/synthetic-state.json');
  const workflow=new ControlledWorkflow({filePath:process.argv[2]});
  const before=await workflow.detect({caseId:'demo-first',input:syntheticScenario(),sourceRef:'synthetic-fixture-v1'});
  await workflow.approve({caseId:'demo-first',actor:'scripted-approver',note:'Simulated human approval; no real person approved this fixture'});
  await workflow.execute({caseId:'demo-first'});
  await workflow.complete({caseId:'demo-first',actor:'scripted-operator',evidenceRef:'synthetic-bank-verification-v1',observedGap:150000});
  const lesson=await workflow.proposeLesson({caseId:'demo-first',actor:'scripted-operator',reason:'A timestamped bank check makes the verification instruction more specific.'});
  await workflow.reviewLesson({lessonId:lesson.id,actor:'scripted-reviewer',approved:true,reason:'Approve advisory wording only; retain human approval and existing detector.'});
  const after=await workflow.detect({caseId:'demo-later',input:syntheticScenario(),sourceRef:'synthetic-fixture-v1'});
  const state=await workflow.snapshot();
  console.log(JSON.stringify({mode:MODE,realWorldExecution:false,independentModelReview:false,humanApproval:'SCRIPTED_FIXTURE_ONLY',
    stateFile:path.resolve(process.argv[2]),cases:state.cases.length,events:state.events.length,
    liquidityGapBefore:before.analysis.detected.metrics.liquidityGap,liquidityGapAfter:after.analysis.detected.metrics.liquidityGap,
    before:before.analysis.ralph.summary,after:after.analysis.ralph.summary,appliedLesson:after.appliedLesson,
    completedTasks:state.cases.filter(item=>item.task?.status==='COMPLETED').length,
    laterDecisionStillNeedsApproval:after.status==='AWAITING_APPROVAL',realisedFinancialBenefit:null},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
