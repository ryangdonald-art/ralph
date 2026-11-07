'use strict';
/** Bounded single-tick dispatcher. No timer, network calls, or background execution. */
function createBuildDispatcher({queue,execute,authorize,clock=()=>Date.now(),maxRuntimeMs=120000}={}){
 if(!queue||typeof queue.claim!=='function'||typeof queue.finish!=='function'||typeof execute!=='function'||typeof authorize!=='function'||typeof clock!=='function')throw Error('Invalid dispatcher dependencies');
 if(!Number.isSafeInteger(maxRuntimeMs)||maxRuntimeMs<1000)throw Error('Invalid runtime limit');
 return Object.freeze({async tick({tenantId,workerId}={}){
   if(![tenantId,workerId].every(x=>typeof x==='string'&&x.trim()))throw Error('Tenant and worker required');
   if(await authorize({tenantId,workerId,action:'build-task'})!==true)return Object.freeze({status:'denied'});
   const task=queue.claim({tenantId,workerId});
   if(!task)return Object.freeze({status:'idle'});
   let resultStatus='failed',reason='EXECUTION_FAILED';
   const started=clock();
   try{
     const result=await execute(Object.freeze({...task}));
     if(clock()-started>maxRuntimeMs){reason='RUNTIME_LIMIT_EXCEEDED';}
     else if(result&&result.status==='completed'&&result.productionChanged!==true&&result.paidAction!==true&&result.externalPublication!==true){resultStatus='completed';reason='COMPLETE_FOR_REVIEW';}
     else if(result&&(result.productionChanged===true||result.paidAction===true||result.externalPublication===true)){resultStatus='blocked';reason='UNAUTHORISED_ACTION';}
   }catch(_){reason='EXECUTION_FAILED';}
   const finished=queue.finish({id:task.id,workerId,leaseToken:task.leaseToken,status:resultStatus});
   return Object.freeze({status:finished.status,taskId:task.id,reason,approvalGranted:false});
 }});
}
module.exports={createBuildDispatcher};
