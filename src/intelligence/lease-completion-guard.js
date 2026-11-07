'use strict';
/** Pure preflight check only; DB must enforce equivalent predicates atomically. */
function validateCompletion({task,tenantId,workerId,leaseToken,now,status}={}){
 if(!task||task.tenantId!==tenantId||task.leaseOwner!==workerId||task.leaseToken!==leaseToken||task.state!=='leased'||!(task.leaseUntil>now)||!['completed','failed','blocked'].includes(status))return false;
 return true;
}
module.exports={validateCompletion};
