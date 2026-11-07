'use strict';
const {roles}=require('./council-registry');
const VALID=new Set(['unrecovered','documented','configured','adapter_tested','provider_verified']);
function createConfigurationRegistry(records=[]){
  const entries=new Map();
  function register(record){
    if(!record||!roles[record.role])throw new Error('Unknown specialist role');
    if(!VALID.has(record.status))throw new Error('Invalid configuration status');
    if(typeof record.version!=='string'||!record.version.trim())throw new Error('Configuration version required');
    if(record.status==='provider_verified'&&(!record.provider||!record.providerModel||!record.verificationRunId))throw new Error('Provider verification proof required');
    if(record.status==='configured'&&(!record.instructionsRef||!record.provider))throw new Error('Configured specialist needs instructions and provider');
    const prior=entries.get(record.role);
    if(prior&&prior.version===record.version&&prior.status!==record.status)throw new Error('Conflicting configuration status');
    const safe=Object.freeze({role:record.role,status:record.status,version:record.version,provider:record.provider||null,providerModel:record.providerModel||null,instructionsRef:record.instructionsRef||null,verificationRunId:record.verificationRunId||null});
    entries.set(record.role,safe);return safe;
  }
  records.forEach(register);
  return Object.freeze({register,get(role){return entries.get(role)||null;},list(){return Object.keys(roles).map(role=>entries.get(role)||Object.freeze({role,status:'unrecovered',version:null}));}});
}
module.exports={createConfigurationRegistry};
