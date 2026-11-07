'use strict';
/**
 * Provider adapter boundary. The transport is injected and must be a trusted
 * server-side implementation; this module never makes network calls.
 */
const {PROVIDERS}=require('./provider-router');
function createProviderAdapter({provider,transport,configuration,authorize}={}){
 if(!PROVIDERS[provider])throw new Error('Unsupported provider');
 if(typeof transport!=='function'||typeof authorize!=='function')throw new Error('Transport and authorization required');
 if(!configuration||typeof configuration.model!=='string'||!configuration.model.trim()||typeof configuration.version!=='string'||!configuration.version.trim())throw new Error('Versioned model configuration required');
 return Object.freeze({async execute({tenantId,runId,role,brief}={}){
  if(![tenantId,runId,role,brief].every(v=>typeof v==='string'&&v.trim()))throw new Error('Missing execution context');
  if(await authorize({tenantId,provider,role,model:configuration.model})!==true)throw new Error('Provider execution not authorized');
  const request=Object.freeze({tenantId,runId,role,brief,model:configuration.model,configurationVersion:configuration.version});
  let response;
  try{response=await transport(request);}catch(_){return Object.freeze({role,runId,status:'failed',errorCode:'PROVIDER_TRANSPORT_FAILED',providerExecutionVerified:false});}
  if(!response||response.runId!==runId||response.role!==role||typeof response.providerRunId!=='string'||!response.providerRunId.trim()||typeof response.summary!=='string'||!response.summary.trim()||!Array.isArray(response.evidenceRefs))return Object.freeze({role,runId,status:'failed',errorCode:'INVALID_PROVIDER_RESPONSE',providerExecutionVerified:false});
  return Object.freeze({role,runId,status:'completed',provider,providerRunId:response.providerRunId,model:configuration.model,configurationVersion:configuration.version,summary:response.summary,evidenceRefs:[...response.evidenceRefs],providerExecutionVerified:false});
 }});
}
module.exports={createProviderAdapter};
