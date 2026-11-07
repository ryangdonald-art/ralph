'use strict';
/**
 * Pure, fail-closed build-job policy. The trusted host must enforce these
 * restrictions at the OS/container and credential layers; this policy is not
 * a sandbox or authorization service by itself.
 */
const SAFE_TASKS=Object.freeze(['inspect','test','lint','document','prototype','draft_pr']);
function evaluateBuildPolicy({task,capabilities,limits}={}){
 if(!task||typeof task!=='object'||!SAFE_TASKS.includes(task.kind))return Object.freeze({allowed:false,reason:'TASK_NOT_ALLOWLISTED'});
 if(!capabilities||typeof capabilities!=='object'||!limits||typeof limits!=='object')return Object.freeze({allowed:false,reason:'POLICY_MISSING'});
 const required=['isolatedWorkspace','readOnlyProduction','noExternalPublish','noProductionDeploy','noPaidCalls','noSecretsInPrompt'];
 if(required.some(k=>capabilities[k]!==true))return Object.freeze({allowed:false,reason:'ISOLATION_UNVERIFIED'});
 if(!Number.isSafeInteger(limits.maxRuntimeMs)||limits.maxRuntimeMs<1000||limits.maxRuntimeMs>600000)return Object.freeze({allowed:false,reason:'RUNTIME_LIMIT_INVALID'});
 if(!Number.isSafeInteger(limits.maxAttempts)||limits.maxAttempts<1||limits.maxAttempts>3)return Object.freeze({allowed:false,reason:'RETRY_LIMIT_INVALID'});
 if(limits.maxCostUsd!==0)return Object.freeze({allowed:false,reason:'UNAPPROVED_SPEND'});
 return Object.freeze({allowed:true,reason:'ELIGIBLE_FOR_ISOLATED_EXECUTION',maxRuntimeMs:limits.maxRuntimeMs});
}
module.exports={SAFE_TASKS,evaluateBuildPolicy};
