const test = require('node:test');
const assert = require('node:assert/strict');
const { canExecute } = require('../src/domain/contracts');
const { requireLegacyOrganization, loadMembership } = require('../src/security/requireAuthorization');
const { SupabaseRestRepository } = require('../src/repositories/supabaseRestRepository');

test('permission values and approval must be typed, bounded and explicit', () => {
  for (const permissionLevel of [-1, 0, 1, 2, 1.5, NaN, Infinity, undefined, '3', 4]) {
    assert.equal(canExecute({ permissionLevel, approved:true, actionType:'REQUEST_INFO' }),false);
  }
  assert.equal(canExecute({permissionLevel:3,approved:'false',actionType:'REQUEST_INFO'}),false);
  assert.equal(canExecute({permissionLevel:3,approved:true,actionType:'REQUEST_INFO'}),true);
});

test('legacy shared JSON data excludes other organisations', () => {
  for (const organization_key of ['another-business', '', undefined]) {
    let error;
    requireLegacyOrganization({membership:{organization_key}},null,e=>{error=e;});
    assert.equal(error.code,'AUTHZ_DENIED');
  }
  let error = 'not called';
  requireLegacyOrganization({membership:{organization_key:'dealworx'}},null,e=>{error=e;});
  assert.equal(error,undefined);
});

test('membership without organization fails closed', async t => {
  t.mock.method(global,'fetch',async()=>({ok:true,json:async()=>[{user_id:'test-human',active:true,role:'ADMIN',organization_key:' '}]}));
  await assert.rejects(loadMembership({identity:{id:'test-human'},accessToken:'synthetic'}),{code:'AUTHZ_DENIED'});
});

test('repository enforces organization scope despite caller overrides', async () => {
  const repo=new SupabaseRestRepository({baseUrl:'https://example.invalid',publishableKey:'synthetic',accessToken:'synthetic',organizationKey:'dealworx'});
  let request;
  repo.request=async(table,options)=>{request={table,...options};return [{id:'test'}];};
  await repo.list('actions','organization_key=eq.other&organization_key=eq.third&status=eq.OPEN');
  const params=new URLSearchParams(request.query);
  assert.deepEqual(params.getAll('organization_key'),['eq.dealworx']);
  assert.equal(params.get('status'),'eq.OPEN');
  await assert.rejects(repo.insert('actions',{organization_key:'other'}),{code:'AUTHZ_DENIED'});
  await assert.rejects(repo.update('actions','test',{organization_key:'other'}),{code:'AUTHZ_DENIED'});
  await repo.insert('actions',{summary:'synthetic'});
  assert.equal(request.body.organization_key,'dealworx');
  assert.throws(()=>new SupabaseRestRepository({baseUrl:'https://example.invalid',publishableKey:'synthetic',accessToken:'synthetic'}),{code:'AUTHZ_DENIED'});
});
