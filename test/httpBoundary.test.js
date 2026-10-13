const test=require('node:test');
const assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://example.invalid';
process.env.SUPABASE_PUBLISHABLE_KEY='synthetic-test-key';
process.env.STORAGE_PROVIDER='supabase';
const {createApp}=require('../src/server');

test('HTTP boundary enforces identity, role, organisation and blocked execution',async t=>{
 let membership={user_id:'test-human',role:'VIEWER',active:true,organization_key:'dealworx'};
 let writes=0;
 const app=createApp({services:{deals:{list:()=>[{id:'synthetic-deal'}],create:()=>{writes++;return{};}},signals:{list:()=>[]},posts:{list:()=>[]}}});
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const fetchOriginal=global.fetch;
 t.mock.method(global,'fetch',async(url,options)=>{
  if(String(url).startsWith('https://example.invalid/auth/v1/user')) return new Response(JSON.stringify({id:'test-human'}));
  if(String(url).startsWith('https://example.invalid/rest/v1/app_members')) return new Response(JSON.stringify([membership]));
  if(String(url).startsWith('https://example.invalid/')) throw new Error('Unexpected database access');
  return fetchOriginal(url,options);
 });
 const base=`http://127.0.0.1:${server.address().port}`;
 const headers={Authorization:'Bearer aa.bb.cc','Content-Type':'application/json'};
 assert.equal((await fetch(`${base}/api/deals`)).status,401);
 assert.equal((await fetch(`${base}/api/deals`,{headers})).status,200);
 assert.equal((await fetch(`${base}/api/deals`,{headers,method:'POST',body:'{}'})).status,403);
 membership={...membership,role:'ADMIN',organization_key:'another-business'};
 assert.equal((await fetch(`${base}/api/deals`,{headers})).status,403);
 assert.equal((await fetch(`${base}/api/posts`,{headers})).status,403);
 membership={...membership,organization_key:'dealworx'};
 const blocked=await fetch(`${base}/api/actions/synthetic/approve-execute`,{headers,method:'POST'});
 assert.equal(blocked.status,503);
 assert.match((await blocked.json()).error.message,/atomic|transaction|execution/i);
 assert.equal(writes,0);
});
