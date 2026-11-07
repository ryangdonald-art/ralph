'use strict';
const {planProvider}=require('./provider-router');
const {evaluateProviderReadiness}=require('./provider-readiness');
/**
 * Selects only ready providers. Readiness is caller-supplied and MUST be derived
 * from trusted server-side checks; this is not an authorization boundary.
 */
function selectReadyProvider({role,available=[],approved=[],readiness={}}={}){
  const candidate=planProvider({role,available,approved});
  if(candidate.status==='blocked')return Object.freeze({...candidate,reason:'NO_AVAILABLE_APPROVED_PROVIDER'});
  const preferences=require('./provider-router').ROLE_PREFERENCES[role];
  for(const provider of preferences){
    if(!available.includes(provider)||!approved.includes(provider))continue;
    const report=evaluateProviderReadiness({provider,...readiness[provider]});
    if(report.ready)return Object.freeze({role,provider,status:'ready',reason:'SERVER_SIDE_REVALIDATION_REQUIRED'});
  }
  return Object.freeze({role,provider:null,status:'blocked',reason:'NO_VERIFIED_READY_PROVIDER'});
}
module.exports={selectReadyProvider};
