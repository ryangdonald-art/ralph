'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {createTaskQueue}=require('../src/intelligence/build-task-queue');
test('task cannot be claimed by another tenant',()=>{const q=createTaskQueue();q.enqueue({id:'a',tenantId:'A',kind:'test'});assert.equal(q.claim({workerId:'w',tenantId:'B'}),null)});
test('claim requires tenant and worker',()=>assert.throws(()=>createTaskQueue().claim({workerId:'w'})));
test('duplicate ID rejected',()=>{const q=createTaskQueue();q.enqueue({id:'a',tenantId:'A',kind:'test'});assert.throws(()=>q.enqueue({id:'a',tenantId:'A',kind:'test'}))});
test('priority selects lowest first',()=>{const q=createTaskQueue();q.enqueue({id:'a',tenantId:'A',kind:'test',priority:8});q.enqueue({id:'b',tenantId:'A',kind:'test',priority:1});assert.equal(q.claim({workerId:'w',tenantId:'A'}).id,'b')});
test('dependencies must complete first',()=>{const q=createTaskQueue();q.enqueue({id:'b',tenantId:'A',kind:'test',dependencies:['a'],priority:1});q.enqueue({id:'a',tenantId:'A',kind:'test'});assert.equal(q.claim({workerId:'w',tenantId:'A'}).id,'a');q.finish({id:'a',workerId:'w',leaseToken:1,status:'completed'});assert.equal(q.claim({workerId:'w',tenantId:'A'}).id,'b')});
test('cross tenant dependency never satisfies',()=>{const q=createTaskQueue();q.enqueue({id:'a',tenantId:'A',kind:'test'});q.enqueue({id:'b',tenantId:'B',kind:'test',dependencies:['a']});const r=q.claim({workerId:'w',tenantId:'A'});q.finish({id:r.id,workerId:'w',leaseToken:r.leaseToken,status:'completed'});assert.equal(q.claim({workerId:'w',tenantId:'B'}),null)});
test('second worker cannot claim active lease',()=>{const q=createTaskQueue();q.enqueue({id:'a',tenantId:'A',kind:'test'});q.claim({workerId:'w1',tenantId:'A'});assert.equal(q.claim({workerId:'w2',tenantId:'A'}),null)});
test('wrong worker cannot finish',()=>{const q=createTaskQueue();q.enqueue({id:'a',tenantId:'A',kind:'test'});q.claim({workerId:'w1',tenantId:'A'});assert.throws(()=>q.finish({id:'a',workerId:'w2',leaseToken:1,status:'completed'}))});
test('expired lease may be reclaimed',()=>{let now=0;const q=createTaskQueue({clock:()=>now,leaseMs:1000});q.enqueue({id:'a',tenantId:'A',kind:'test'});q.claim({workerId:'w1',tenantId:'A'});now=1000;assert.equal(q.claim({workerId:'w2',tenantId:'A'}).leaseOwner,'w2')});
test('attempt ceiling blocks repeated claims',()=>{let now=0;const q=createTaskQueue({clock:()=>now,leaseMs:1000,maxAttempts:1});q.enqueue({id:'a',tenantId:'A',kind:'test'});q.claim({workerId:'w',tenantId:'A'});now=1001;assert.equal(q.claim({workerId:'w',tenantId:'A'}),null)});
test('completed task not reclaimed',()=>{const q=createTaskQueue();q.enqueue({id:'a',tenantId:'A',kind:'test'});q.claim({workerId:'w',tenantId:'A'});q.finish({id:'a',workerId:'w',status:'completed'});assert.equal(q.claim({workerId:'w',tenantId:'A'}),null)});
test('self dependency rejected',()=>assert.throws(()=>createTaskQueue().enqueue({id:'a',tenantId:'A',kind:'test',dependencies:['a']})));

test('stale worker token rejected after lease reclaimed',()=>{
 let now=0;const q=createTaskQueue({clock:()=>now,leaseMs:1000});
 q.enqueue({id:'a',tenantId:'A',kind:'test'});
 const first=q.claim({workerId:'same',tenantId:'A'});now=1000;
 const second=q.claim({workerId:'same',tenantId:'A'});
 assert.notEqual(first.leaseToken,second.leaseToken);
 assert.throws(()=>q.finish({id:'a',workerId:'same',leaseToken:first.leaseToken,status:'completed'}));
 assert.equal(q.finish({id:'a',workerId:'same',leaseToken:second.leaseToken,status:'completed'}).status,'completed');
});
