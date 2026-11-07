'use strict';
/** Nonproduction bounded task scheduler. Persistence and authentication required before hosting. */
const STATES=new Set(['queued','leased','completed','failed','blocked']);
function createTaskQueue({clock=()=>Date.now(),leaseMs=300000,maxAttempts=3}={}){
 if(typeof clock!=='function'||!Number.isSafeInteger(leaseMs)||leaseMs<1000||!Number.isSafeInteger(maxAttempts)||maxAttempts<1)throw Error('Invalid queue settings');
 const tasks=new Map();
 function snapshot(t){return Object.freeze({...t,dependencies:[...t.dependencies]});}
 return Object.freeze({
  enqueue({id,tenantId,kind,priority=5,dependencies=[]}={}){
   if(![id,tenantId,kind].every(x=>typeof x==='string'&&x.trim())||!Number.isInteger(priority)||priority<0||priority>10||!Array.isArray(dependencies)||dependencies.some(x=>typeof x!=='string'||!x.trim())||dependencies.includes(id))throw Error('Invalid task');
   if(tasks.has(id))throw Error('Duplicate task ID');
   const t={id,tenantId,kind,priority,dependencies:[...dependencies],status:'queued',attempts:0,leaseOwner:null,leaseUntil:null};
   tasks.set(id,t);return snapshot(t);
  },
  claim({workerId,tenantId}={}){
   if(![workerId,tenantId].every(x=>typeof x==='string'&&x.trim()))throw Error('Worker and tenant required');
   const now=clock();
   const eligible=[...tasks.values()].filter(t=>t.tenantId===tenantId&&(t.status==='queued'||(t.status==='leased'&&t.leaseUntil<=now))&&t.attempts<maxAttempts&&t.dependencies.every(id=>tasks.get(id)?.tenantId===tenantId&&tasks.get(id).status==='completed'));
   eligible.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
   const t=eligible[0];if(!t)return null;
   t.status='leased';t.attempts++;t.leaseOwner=workerId;t.leaseUntil=now+leaseMs;return snapshot(t);
  },
  finish({id,workerId,status}={}){
   const t=tasks.get(id);
   if(!t||t.status!=='leased'||t.leaseOwner!==workerId||t.leaseUntil<=clock()||!['completed','failed','blocked'].includes(status))throw Error('Invalid lease completion');
   t.status=status;t.leaseOwner=null;t.leaseUntil=null;return snapshot(t);
  },
  list(tenantId){if(typeof tenantId!=='string'||!tenantId.trim())throw Error('Tenant required');return [...tasks.values()].filter(t=>t.tenantId===tenantId).map(snapshot);}
 });
}
module.exports={createTaskQueue,STATES};
