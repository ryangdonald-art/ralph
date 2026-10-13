// Run with RALPH_PGLITE_MODULE pointing to a disposable external PGlite install.
const {PGlite}=require(process.env.RALPH_PGLITE_MODULE||'@electric-sql/pglite');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const uid='ca110000-0000-4000-8000-000000000001',other='ca110000-0000-4000-8000-000000000002';
const sigA='ca110000-0000-4000-8000-000000000010',sigB='ca110000-0000-4000-8000-000000000020',dec='ca110000-0000-4000-8000-000000000030',action='ca110000-0000-4000-8000-000000000040';
const evidence=(signal=sigA,actor=uid)=>`insert into public.evidence(organization_key,signal_id,created_by,evidence_type,source_system,payload,provenance) values('test-a','${signal}','${actor}','CALCULATED_INPUT','RALPH_SYNTHETIC','{}','{"synthetic":true}')`;
const agent=()=>`insert into public.agent_runs(organization_key,created_by,agent,provider,model,signal_id,confidence,output) values('test-a','${uid}','SHERLOCK','DETERMINISTIC','contract-v1','${sigA}',null,'{"reviewMethod":"DETERMINISTIC_TEMPLATE"}')`;
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;`);
 for(const f of fs.readdirSync(path.join(__dirname,'recovered')).filter(f=>f.endsWith('.sql')).sort()){
   // gen_random_uuid is native PostgreSQL; PGlite has no pgcrypto package here.
   const sql=fs.readFileSync(path.join(__dirname,'recovered',f),'utf8').replace('create extension if not exists pgcrypto;','-- PGlite-only shim: native gen_random_uuid already available.');
   await db.exec(sql);
 }
 await db.exec(`insert into auth.users(id) values('${uid}'),('${other}');insert into public.app_members(user_id,organization_key,role) values('${uid}','test-a','OPERATOR'),('${other}','test-b','ADMIN');insert into public.signals(id,organization_key,signal_type,summary,source_system) values('${sigA}','test-a','CASH_FLOW_DANGER','A','RALPH_SYNTHETIC'),('${sigB}','test-b','CASH_FLOW_DANGER','B','RALPH_SYNTHETIC');insert into public.decisions(id,organization_key,signal_id,output_type,summary) values('${dec}','test-a','${sigA}','TASK','Test');insert into public.actions(id,organization_key,decision_id,action_type,requested_action,permission_level,status,idempotency_key) values('${action}','test-a','${dec}','REQUEST_INFO','{"kind":"REQUEST_INFO","synthetic":true}',3,'AWAITING_APPROVAL','test-action');`);
 return db;
}
async function identity(db,id=uid,role='authenticated'){await db.exec(`set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);}
async function denied(db,sql,code='42501'){await assert.rejects(()=>db.exec(sql),e=>e.code===code);}
(async()=>{
 const results={baseline:[],repair:[],limits:['Disposable PGlite; auth.users simplified and auth.uid emulated from session setting.','Only pgcrypto CREATE EXTENSION omitted; native gen_random_uuid used. Recovered SQL files unchanged.','No JWT validation, PostgREST, live project or actual owner sign-in exercised.','Prepared inserts remain multistep and nonatomic; execution and synthetic HTTP route must remain disabled.']};
 let db=await database();await identity(db);
 await db.exec(evidence(sigB));results.baseline.push('DEFECT reproduced: operator inserts own-tenant evidence linked to other-tenant signal.');
 await db.exec(`update public.actions set status='EXECUTED',execution_result='{"forged":true}' where id='${action}'`);results.baseline.push('DEFECT reproduced: operator marks action EXECUTED with fabricated result, no approval.');
 await denied(db,agent());results.baseline.push('DEFECT reproduced: current preparation agent_runs INSERT denied (42501).');
 await db.exec(evidence(sigA,other));results.baseline.push('DEFECT reproduced: operator records another user as created_by.');
 await db.exec(`insert into public.outcomes(organization_key,decision_id,outcome_type,summary,economic_state,economic_amount) values('test-a','${dec}','TEST','fabricated realised value','REALIZED',100)`);results.baseline.push('DEFECT reproduced: operator inserts REALIZED outcome without verification.');await db.close();
 db=await database();await db.exec(fs.readFileSync(path.join(__dirname,'proposed-preparation-repair.sql'),'utf8'));await identity(db);
 await denied(db,evidence(sigB),'23503');results.repair.push('Cross-organization parent blocked by composite FK.');
 await denied(db,`update public.actions set status='EXECUTED' where id='${action}'`);results.repair.push('Execution status update denied.');
 await denied(db,evidence(sigA,other));results.repair.push('Forged actor denied.');
 await db.exec(evidence());results.repair.push('Synthetic same-organization evidence accepted.');
 await db.exec(agent());results.repair.push('Deterministic synthetic agent run accepted with NULL confidence.');
 await denied(db,agent().replace("null,'{", "0.99,'{"));results.repair.push('Invented numerical template confidence denied.');
 await denied(db,`insert into public.approvals(action_id,organization_key,status) values('${action}','test-a','APPROVED')`);results.repair.push('Direct approval insert denied.');
 await denied(db,`insert into public.outcomes(organization_key,decision_id,outcome_type,summary) values('test-a','${dec}','TEST','fabricated')`);results.repair.push('Direct outcome insert denied.');
 assert.equal((await db.query('select count(*)::int n from public.signals')).rows[0].n,1);results.repair.push('Reads isolated to own organization.');
 await db.exec('reset role');await db.exec(`update public.app_members set role='VIEWER' where user_id='${uid}'`);await identity(db);await denied(db,evidence());results.repair.push('Viewer write denied.');
 await db.exec('reset role');await db.exec(`update public.app_members set active=false where user_id='${uid}'`);await identity(db);assert.equal((await db.query('select count(*)::int n from public.signals')).rows[0].n,0);await denied(db,evidence());results.repair.push('Inactive member read/write denied.');
 await db.exec('reset role');await identity(db,uid,'anon');await denied(db,'select * from public.signals');results.repair.push('Anonymous read denied.');
 await db.close();console.log(JSON.stringify({status:'PASS',...results},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
