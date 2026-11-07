'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {createBuildDispatcher}=require('../src/intelligence/build-dispatcher');
const {createTaskQueue}=require('../src/intelligence/build-task-queue');
const setup=(overrides={})=>{
 const queue=createTaskQueue();
 const d=createBuildDispatcher({queue,authorize:async()=>true,execute:async()=>({status:'completed'}),...overrides});
 return {queue,d};
};
test('idle queue returns idle',async()=>assert.equal((await setup().d.tick({tenantId:'A',workerId:'w'})).status,'idle'));
test('authorisation failure does not claim',async()=>{const {queue,d}=setup({authorize:async()=>false});queue.enqueue({id:'1',tenantId:'A',kind:'code'});assert.equal((await d.tick({tenantId:'A',workerId:'w'})).status,'denied');assert.equal(queue.list('A')[0].status,'queued')});
test('completed task still requires human review',async()=>{const {queue,d}=setup();queue.enqueue({id:'1',tenantId:'A',kind:'code'});const r=await d.tick({tenantId:'A',workerId:'w'});assert.equal(r.status,'completed');assert.equal(r.approvalGranted,false)});
test('execution exception fails closed',async()=>{const {queue,d}=setup({execute:async()=>{throw Error('secret')}});queue.enqueue({id:'1',tenantId:'A',kind:'code'});const r=await d.tick({tenantId:'A',workerId:'w'});assert.equal(r.status,'failed');assert.equal(JSON.stringify(r).includes('secret'),false)});
test('production changes reported by executor are blocked',async()=>{const {queue,d}=setup({execute:async()=>({status:'completed',productionChanged:true})});queue.enqueue({id:'1',tenantId:'A',kind:'code'});assert.equal((await d.tick({tenantId:'A',workerId:'w'})).status,'blocked')});
test('paid action reported by executor is blocked',async()=>{const {queue,d}=setup({execute:async()=>({status:'completed',paidAction:true})});queue.enqueue({id:'1',tenantId:'A',kind:'code'});assert.equal((await d.tick({tenantId:'A',workerId:'w'})).status,'blocked')});
test('external publication reported by executor is blocked',async()=>{const {queue,d}=setup({execute:async()=>({status:'completed',externalPublication:true})});queue.enqueue({id:'1',tenantId:'A',kind:'code'});assert.equal((await d.tick({tenantId:'A',workerId:'w'})).status,'blocked')});
test('runtime budget excess fails task',async()=>{let now=0;const {queue,d}=setup({clock:()=>now,maxRuntimeMs:1000,execute:async()=>{now=1001;return {status:'completed'}}});queue.enqueue({id:'1',tenantId:'A',kind:'code'});assert.equal((await d.tick({tenantId:'A',workerId:'w'})).status,'failed')});
test('cross tenant tasks cannot be dispatched',async()=>{const {queue,d}=setup();queue.enqueue({id:'1',tenantId:'B',kind:'code'});assert.equal((await d.tick({tenantId:'A',workerId:'w'})).status,'idle')});
test('invalid dispatcher dependencies rejected',()=>assert.throws(()=>createBuildDispatcher({})));
