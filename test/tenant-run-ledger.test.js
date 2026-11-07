'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createTenantRunLedger} = require('../src/intelligence/tenant-run-ledger');
test('tenant A cannot list tenant B events',()=>{
  const l=createTenantRunLedger();
  l.append({tenantId:'A',runId:'1',role:'RAT',status:'completed'});
  l.append({tenantId:'B',runId:'2',role:'BOB',status:'failed'});
  assert.deepEqual(l.list('A').map(x=>x.runId),['1']);
  assert.deepEqual(l.list('B').map(x=>x.runId),['2']);
});
test('unknown tenant returns empty records',()=>assert.deepEqual(createTenantRunLedger().list('unknown'),[]));
test('missing tenant rejected on read',()=>assert.throws(()=>createTenantRunLedger().list('')));
test('missing tenant rejected on append',()=>assert.throws(()=>createTenantRunLedger().append({runId:'1',role:'RAT',status:'completed'})));
test('missing role rejected',()=>assert.throws(()=>createTenantRunLedger().append({tenantId:'A',runId:'1',status:'completed'})));
test('global run ID replay rejected across tenants',()=>{
 const l=createTenantRunLedger();l.append({tenantId:'A',runId:'1',role:'RAT',status:'completed'});
 assert.throws(()=>l.append({tenantId:'B',runId:'1',role:'BOB',status:'completed'}));
});
test('read returns detached snapshots',()=>{
 const l=createTenantRunLedger();l.append({tenantId:'A',runId:'1',role:'RAT',status:'completed'});
 const a=l.list('A');a[0].status='modified';assert.equal(l.list('A')[0].status,'completed');
});
