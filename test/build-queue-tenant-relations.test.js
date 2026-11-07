'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/candidates/20261107_unattended_build_queue_staging_only.sql'),'utf8');
test('task IDs have composite tenant uniqueness',()=>assert.match(sql,/unique\s*\(id,tenant_id\)/i));
test('task dependencies enforce same tenant on both references',()=>{
 const start=sql.indexOf('create table if not exists public.ralph_build_task_dependencies');
 const end=sql.indexOf('create table if not exists public.ralph_build_task_events');
 const section=sql.slice(start,end);
 assert.match(section,/foreign key \(task_id,tenant_id\) references public\.ralph_build_tasks\(id,tenant_id\)/i);
 assert.match(section,/foreign key \(depends_on_task_id,tenant_id\) references public\.ralph_build_tasks\(id,tenant_id\)/i);
});
test('event records enforce tenant matches task',()=>{
 const start=sql.indexOf('create table if not exists public.ralph_build_task_events');
 const end=sql.indexOf('create index if not exists ralph_build_task_events_tenant_idx');
 assert.match(sql.slice(start,end),/foreign key \(task_id,tenant_id\) references public\.ralph_build_tasks\(id,tenant_id\)/i);
});
