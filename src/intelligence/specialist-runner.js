'use strict';
const {roles,route}=require('./council-registry');
function validateResult(result,role){
if(!result||typeof result!=='object'||Array.isArray(result))throw new Error('Invalid specialist result');
if(result.role!==role)throw new Error('Specialist role mismatch');
if(typeof result.summary!=='string'||!result.summary.trim())throw new Error('Specialist summary required');
if(!Array.isArray(result.evidenceRefs)||!result.evidenceRefs.every(x=>typeof x==='string'&&x.trim()))throw new Error('Evidence refs required');
return {role,summary:result.summary,evidenceRefs:[...result.evidenceRefs]};
}
function createRunner({execute,clock=()=>new Date().toISOString(),idFactory}={}){
if(typeof execute!=='function'||typeof idFactory!=='function')throw new Error('Execution adapter and ID factory required');
return {async run({kind,role,brief,configurationVersion}){
if(!route(kind,'material').includes(role)||!roles[role])throw new Error('Role not allowed for task');
if(typeof brief!=='string'||!brief.trim())throw new Error('Brief required');
if(typeof configurationVersion!=='string'||!configurationVersion.trim())throw new Error('Configuration version required');
const runId=idFactory();if(typeof runId!=='string'||!runId.trim())throw new Error('Run ID required');
const startedAt=clock();
try{
const response=await execute({kind,role,brief,configurationVersion,runId});
const validated=validateResult(response,role);
return Object.freeze({runId,kind,role,configurationVersion,startedAt,completedAt:clock(),status:'completed',independent:false,providerExecutionVerified:false,...validated});
}catch(error){return Object.freeze({runId,kind,role,configurationVersion,startedAt,completedAt:clock(),status:'failed',independent:false,providerExecutionVerified:false,errorCode:'EXECUTION_FAILED'});}
}};
}
module.exports={createRunner,validateResult};
