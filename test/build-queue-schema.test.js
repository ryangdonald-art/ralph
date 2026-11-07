'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/candidates/20261107_unattended_build_queue_staging_only.sql'),'utf8');
test('candidate queue enables RLS on both tables',()=>{
 assert.match(sql,/alter table public\.ralph_build_tasks enable row level security/i);
 assert.match(sql,/alter table public\.ralph_build_task_events enable row level security/i);
});
test('candidate revokes client table access',()=>{
 assert.match(sql,/revoke all on public\.ralph_build_tasks from anon, authenticated/i);
 assert.match(sql,/revoke all on public\.ralph_build_task_events from anon, authenticated/i);
});
test('candidate includes fencing and bounded retries',()=>{
 assert.match(sql,/lease_token bigint not null default 0/i);
 assert.match(sql,/max_attempts between 1 and 3/i);
});
test('candidate creates no broad allow policy',()=>{
 assert.doesNotMatch(sql,/create\s+policy\s+/i);
});
test('candidate contains no privileged worker function',()=>{
 assert.doesNotMatch(sql,/security\s+definer/i);
});
