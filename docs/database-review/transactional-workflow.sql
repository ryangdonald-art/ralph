-- LOCAL CANDIDATE ONLY; requires recovered migrations + proposed-preparation-repair.sql.
-- No live DDL authorised by this artifact; all HTTP write routes remain paused.
-- Private definer is necessary to prohibit direct writes while offering atomic, narrow commands.
-- Trusted migration owner owns functions/tables. No service key or user metadata is used.
begin;
create schema ralph_private;
revoke all on schema ralph_private from public,anon,authenticated;
grant usage on schema ralph_private to authenticated;
create table ralph_private.command_receipts (
 organization_key text not null, request_key text not null, actor_id uuid not null references auth.users(id),
 command text not null, request jsonb not null, response jsonb not null,
 created_at timestamptz not null default now(), primary key(organization_key,request_key)
);
alter table ralph_private.command_receipts enable row level security;
revoke all on ralph_private.command_receipts from public,anon,authenticated;
create table public.internal_tasks (
 id uuid primary key default gen_random_uuid(), organization_key text not null,
 action_id uuid not null unique, decision_id uuid not null,
 assigned_to uuid not null references auth.users(id), created_by uuid not null references auth.users(id),
 status text not null check(status in ('OPEN','COMPLETED')),
 requires_observed_at boolean not null default false,
 instruction text not null, synthetic boolean not null default true check(synthetic),
 created_at timestamptz not null default now(), completed_at timestamptz,
 completed_by uuid references auth.users(id), observation jsonb, outcome_id uuid,
 unique(organization_key,id),
 foreign key(organization_key,action_id) references public.actions(organization_key,id),
 foreign key(organization_key,decision_id) references public.decisions(organization_key,id),
 foreign key(organization_key,outcome_id) references public.outcomes(organization_key,id)
);
create table public.reviewed_lessons (
 id uuid primary key default gen_random_uuid(), organization_key text not null,
 task_id uuid not null unique, outcome_id uuid not null,
 status text not null check(status in ('PROPOSED','REVIEWED','REJECTED')),
 rule_key text not null check(rule_key='VERIFY_CLEARED_CASH_BEFORE_COMMITMENT'),
 lesson text not null, proposed_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz, review_reason text, synthetic boolean not null default true check(synthetic),
 foreign key(organization_key,task_id) references public.internal_tasks(organization_key,id),
 foreign key(organization_key,outcome_id) references public.outcomes(organization_key,id)
);
create index internal_tasks_org_status_idx on public.internal_tasks(organization_key,status);
create index reviewed_lessons_org_status_idx on public.reviewed_lessons(organization_key,status);
alter table public.internal_tasks enable row level security;
alter table public.reviewed_lessons enable row level security;
revoke all on public.internal_tasks,public.reviewed_lessons from public,anon,authenticated;
grant select on public.internal_tasks,public.reviewed_lessons to authenticated;
create policy tasks_member_read on public.internal_tasks for select to authenticated using
(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=internal_tasks.organization_key));
create policy lessons_member_read on public.reviewed_lessons for select to authenticated using
(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=reviewed_lessons.organization_key));
-- Even preparation objects are now command-written only. Prior permissive policies cannot override grants.
revoke insert,update,delete,truncate,references,trigger on public.entities,public.signals,public.evidence,
public.investigations,public.decisions,public.actions,public.approvals,public.outcomes,public.agent_runs
from public,anon,authenticated;

create function ralph_private.workflow_command(p_command text,p_key text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); member public.app_members%rowtype;
 previous ralph_private.command_receipts%rowtype;
 a public.actions%rowtype; t public.internal_tasks%rowtype; l public.reviewed_lessons%rowtype;
 signal_id uuid; evidence_id uuid; investigation_id uuid; decision_id uuid; action_id uuid;
 task_id uuid; v_outcome_id uuid; lesson_id uuid;
 cash numeric; commitments numeric; gap numeric; observed_at timestamptz; learned jsonb; response jsonb; run_agent text;
begin
 if actor is null then raise exception 'authentication required' using errcode='42501'; end if;
 select * into member from public.app_members where user_id=actor and active for share;
 if not found or member.role not in ('ADMIN','OPERATOR') then raise exception 'active operator required' using errcode='42501'; end if;
 if p_command is null or p_command not in ('PREPARE','APPROVE','COMPLETE','REVIEW') then raise exception 'unsupported command' using errcode='22023'; end if;
 if p_key is null or length(btrim(p_key))<1 or length(p_key)>200 then raise exception 'request key required, maximum 200 characters' using errcode='22023'; end if;
 if p_request is null or jsonb_typeof(p_request)<>'object' then raise exception 'object request required' using errcode='22023'; end if;
 if p_command in ('APPROVE','REVIEW') and member.role<>'ADMIN' then raise exception 'administrator required' using errcode='42501'; end if;
 -- Per-organisation key lock serializes duplicate requests; hash collision causes waiting only.
 perform pg_advisory_xact_lock(hashtextextended(member.organization_key||':'||p_key,0));
 select * into previous from ralph_private.command_receipts where organization_key=member.organization_key and request_key=p_key;
 if found then
  if previous.actor_id<>actor or previous.command<>p_command or previous.request<>p_request then
   raise exception 'idempotency key conflicts with prior request' using errcode='22023';
  end if;
  return previous.response;
 end if;
 if p_command='PREPARE' then
  if (select count(*) from jsonb_object_keys(p_request))<>2 or not(p_request ? 'cash' and p_request ? 'commitments')
   or jsonb_typeof(p_request->'cash')<>'number' or jsonb_typeof(p_request->'commitments')<>'number' then
   raise exception 'cash and commitments must be numeric synthetic inputs' using errcode='22023';
  end if;
  cash:=(p_request->>'cash')::numeric; commitments:=(p_request->>'commitments')::numeric;
  if cash<0 or commitments<0 or cash>1000000000000 or commitments>1000000000000 then raise exception 'synthetic inputs out of range' using errcode='22023'; end if;
  gap:=commitments-cash;
  if gap<=25000 then raise exception 'no material synthetic liquidity gap' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'rule_key',rule_key,'lesson',lesson) order by reviewed_at desc),'[]'::jsonb)
  into learned from (select * from public.reviewed_lessons where organization_key=member.organization_key and status='REVIEWED' order by reviewed_at desc limit 20) reviewed;
  insert into public.signals(organization_key,signal_type,summary,source_system,source_ref,provenance,created_by)
  values(member.organization_key,'CASH_FLOW_DANGER','Synthetic liquidity shortfall: '||gap,'RALPH_SYNTHETIC',p_key,jsonb_build_object('synthetic',true,'input',p_request,'detector','cleared-cash-v1'),actor) returning id into signal_id;
  insert into public.evidence(organization_key,signal_id,evidence_type,source_system,source_ref,observed_at,payload,provenance,created_by)
  values(member.organization_key,signal_id,'SYNTHETIC_INPUT','RALPH_SYNTHETIC',p_key,now(),p_request,'{"synthetic":true}',actor) returning id into evidence_id;
  insert into public.investigations(organization_key,signal_id,status,anomaly,baseline,materiality,supporting_evidence,hypotheses,missing_information,economic_exposure,confidence,provenance,created_by)
  values(member.organization_key,signal_id,'COMPLETE','Synthetic commitments exceed cleared cash','Receivables are not cleared cash','MATERIAL',jsonb_build_array(evidence_id),jsonb_build_array('Timing mismatch'),jsonb_build_array('Requires an observed synthetic recheck'),gap,null,jsonb_build_object('synthetic',true,'reviewMethod','DETERMINISTIC_TEMPLATE','reviewedLessons',learned),actor) returning id into investigation_id;
  insert into public.decisions(organization_key,investigation_id,signal_id,output_type,summary,rationale,confidence,provenance,created_by)
  values(member.organization_key,investigation_id,signal_id,'TASK',case when jsonb_array_length(learned)>0 then 'Apply reviewed cash-verification lesson: recheck cleared cash and commitments.' else 'Recheck synthetic cleared cash and commitments.' end,'No payment, contract or external communication is permitted.',null,jsonb_build_object('synthetic',true,'reviewMethod','DETERMINISTIC_TEMPLATE','reviewedLessons',learned),actor) returning id into decision_id;
  insert into public.actions(organization_key,decision_id,action_type,requested_action,permission_level,status,idempotency_key,created_by)
  values(member.organization_key,decision_id,'REQUEST_INFO',jsonb_build_object('kind','REQUEST_INFO','synthetic',true,'text','Record an observed synthetic cash and commitment recheck.','requires_observed_at',jsonb_array_length(learned)>0),3,'AWAITING_APPROVAL','synthetic-command:'||gen_random_uuid(),actor) returning id into action_id;
  foreach run_agent in array array['SHERLOCK','RAT','RALPH'] loop
   insert into public.agent_runs(organization_key,agent,provider,model,signal_id,investigation_id,decision_id,input_refs,context_refs,output,confidence,completed_at,created_by)
   values(member.organization_key,run_agent,'DETERMINISTIC','synthetic-contract-v1',signal_id,investigation_id,decision_id,jsonb_build_array(evidence_id),learned,
   jsonb_build_object('reviewMethod','DETERMINISTIC_TEMPLATE','synthetic',true,'role',run_agent) ||
   case run_agent
   when 'SHERLOCK' then jsonb_build_object('supportingEvidence',jsonb_build_array(evidence_id),'calculation',jsonb_build_object('clearedCash',cash,'committedRequirements',commitments,'shortfall',gap),'finding','Supplied synthetic commitments exceed cleared cash. No receivables counted.')
   when 'RAT' then jsonb_build_object('challenge','Neither supplied balance nor commitments have independent verification.','missingEvidence',jsonb_build_array('Observed recheck with source provenance'),'falsification','Observed cleared cash at or above commitments would remove the shortfall.','alternativeHypothesis','A commitment may be rescheduled; do not assume it has been.')
   else jsonb_build_object('decision_id',decision_id,'action','REQUEST_INFO','rationale','Verify inputs through a controlled internal task before any commitment.','limits',jsonb_build_array('ADMIN approval required','Synthetic only','No external effects'),'requiresObservedTimestamp',jsonb_array_length(learned)>0,'appliedLessons',learned) end,
   null,now(),actor);
  end loop;
  response:=jsonb_build_object('status','AWAITING_HUMAN_APPROVAL','action_id',action_id,'decision_id',decision_id,'signal_id',signal_id,'synthetic',true,'applied_lessons',learned);
 elsif p_command='APPROVE' then
  if (select count(*) from jsonb_object_keys(p_request))<>1 or not(p_request ? 'action_id') then raise exception 'action_id required' using errcode='22023'; end if;
  select * into a from public.actions where id=(p_request->>'action_id')::uuid and organization_key=member.organization_key for update;
  if not found then raise exception 'action unavailable' using errcode='42501'; end if;
  if a.status<>'AWAITING_APPROVAL' or a.action_type<>'REQUEST_INFO' or a.permission_level<>3 or not(a.requested_action @> '{"synthetic":true,"kind":"REQUEST_INFO"}') then raise exception 'action not eligible' using errcode='22023'; end if;
  if not exists(select 1 from ralph_private.command_receipts r where r.organization_key=member.organization_key and r.command='PREPARE' and r.response->>'action_id'=a.id::text) then raise exception 'action was not created by controlled preparation' using errcode='42501'; end if;
  insert into public.approvals(organization_key,action_id,status,approver_id,approval_timestamp,notes) values(member.organization_key,a.id,'APPROVED',actor,now(),'Synthetic internal verification task only.');
  insert into public.internal_tasks(organization_key,action_id,decision_id,assigned_to,created_by,status,instruction,requires_observed_at)
  values(member.organization_key,a.id,a.decision_id,a.created_by,actor,'OPEN','Record observed synthetic cleared cash and committed requirements; no external action.',coalesce((a.requested_action->>'requires_observed_at')::boolean,false)) returning id into task_id;
  update public.actions set status='EXECUTED',execution_result=jsonb_build_object('kind','INTERNAL_TASK_CREATED','task_id',task_id,'synthetic',true),updated_at=now() where id=a.id;
  update public.decisions set status='APPROVED',updated_at=now() where id=a.decision_id;
  response:=jsonb_build_object('status','INTERNAL_TASK_CREATED','task_id',task_id,'action_id',a.id,'synthetic',true);
 elsif p_command='COMPLETE' then
  if (select count(*) from jsonb_object_keys(p_request))<>5 or not(p_request ?& array['task_id','cash','commitments','observation_ref','observed_at'])
   or jsonb_typeof(p_request->'cash')<>'number' or jsonb_typeof(p_request->'commitments')<>'number'
   or jsonb_typeof(p_request->'observation_ref')<>'string' or length(btrim(p_request->>'observation_ref'))<3 or length(p_request->>'observation_ref')>500 then raise exception 'observed synthetic numbers and source reference required' using errcode='22023'; end if;
  cash:=(p_request->>'cash')::numeric; commitments:=(p_request->>'commitments')::numeric;
  if cash<0 or commitments<0 or cash>1000000000000 or commitments>1000000000000 then raise exception 'synthetic inputs out of range' using errcode='22023'; end if;
  select * into t from public.internal_tasks where id=(p_request->>'task_id')::uuid and organization_key=member.organization_key for update;
  if not found or t.assigned_to<>actor then raise exception 'assigned task required' using errcode='42501'; end if;
  if t.status<>'OPEN' then raise exception 'task already completed' using errcode='22023'; end if;
  observed_at:=null;
  if p_request->'observed_at'<>'null'::jsonb then
   if jsonb_typeof(p_request->'observed_at')<>'string' then raise exception 'observed_at must be a timestamp' using errcode='22023'; end if;
   observed_at:=(p_request->>'observed_at')::timestamptz;
   if observed_at<t.created_at or observed_at>clock_timestamp() then raise exception 'observation timestamp must fall between task creation and now' using errcode='22023'; end if;
  end if;
  if t.requires_observed_at and observed_at is null then raise exception 'reviewed lesson requires observation timestamp' using errcode='22023'; end if;
  gap:=greatest(0,commitments-cash);
  insert into public.outcomes(organization_key,action_id,decision_id,outcome_type,summary,economic_state,evidence_refs,measured_at,provenance,created_by)
  values(member.organization_key,t.action_id,t.decision_id,'SYNTHETIC_OBSERVATION','Observed synthetic liquidity gap: '||gap,'ESTIMATED',jsonb_build_array(p_request->>'observation_ref'),coalesce(observed_at,now()),jsonb_build_object('synthetic',true,'observation',p_request,'observed_gap',gap,'no_realised_value_claim',true),actor) returning id into v_outcome_id;
  update public.internal_tasks set status='COMPLETED',completed_at=now(),completed_by=actor,observation=p_request,outcome_id=v_outcome_id where id=t.id;
  insert into public.reviewed_lessons(organization_key,task_id,outcome_id,status,rule_key,lesson,proposed_by)
  values(member.organization_key,t.id,v_outcome_id,'PROPOSED','VERIFY_CLEARED_CASH_BEFORE_COMMITMENT','Recheck cleared cash and committed obligations using an observed source before acting; expected receipts are not cash.',actor) returning id into lesson_id;
  response:=jsonb_build_object('status','TASK_COMPLETED','task_id',t.id,'outcome_id',v_outcome_id,'lesson_id',lesson_id,'observed_gap',gap,'synthetic',true);
 elsif p_command='REVIEW' then
  if (select count(*) from jsonb_object_keys(p_request))<>3 or not(p_request ?& array['lesson_id','accept','reason']) or jsonb_typeof(p_request->'accept')<>'boolean'
   or jsonb_typeof(p_request->'reason')<>'string' or length(btrim(p_request->>'reason'))<10 or length(p_request->>'reason')>1000 then raise exception 'lesson, boolean decision and substantive reason required' using errcode='22023'; end if;
  select * into l from public.reviewed_lessons where id=(p_request->>'lesson_id')::uuid and organization_key=member.organization_key for update;
  if not found then raise exception 'lesson unavailable' using errcode='42501'; end if;
  if l.proposed_by=actor then raise exception 'lesson reviewer must differ from proposer' using errcode='42501'; end if;
  if l.status<>'PROPOSED' then raise exception 'lesson already reviewed' using errcode='22023'; end if;
  update public.reviewed_lessons set status=case when (p_request->>'accept')::boolean then 'REVIEWED' else 'REJECTED' end,reviewed_by=actor,reviewed_at=now(),review_reason=p_request->>'reason' where id=l.id;
  response:=jsonb_build_object('status',case when (p_request->>'accept')::boolean then 'REVIEWED' else 'REJECTED' end,'lesson_id',l.id,'synthetic',true);
 end if;
 insert into ralph_private.command_receipts(organization_key,request_key,actor_id,command,request,response) values(member.organization_key,p_key,actor,p_command,p_request,response);
 return response;
end $$;
revoke all on function ralph_private.workflow_command(text,text,jsonb) from public,anon,authenticated;
grant execute on function ralph_private.workflow_command(text,text,jsonb) to authenticated;
create function public.ralph_prepare_synthetic(p_key text,p_cash numeric,p_commitments numeric) returns jsonb language sql security invoker set search_path='' as $$select ralph_private.workflow_command('PREPARE',p_key,jsonb_build_object('cash',p_cash,'commitments',p_commitments))$$;
create function public.ralph_approve_synthetic(p_key text,p_action_id uuid) returns jsonb language sql security invoker set search_path='' as $$select ralph_private.workflow_command('APPROVE',p_key,jsonb_build_object('action_id',p_action_id))$$;
create function public.ralph_complete_synthetic(p_key text,p_task_id uuid,p_cash numeric,p_commitments numeric,p_observation_ref text,p_observed_at timestamptz default null) returns jsonb language sql security invoker set search_path='' as $$select ralph_private.workflow_command('COMPLETE',p_key,jsonb_build_object('task_id',p_task_id,'cash',p_cash,'commitments',p_commitments,'observation_ref',p_observation_ref,'observed_at',p_observed_at))$$;
create function public.ralph_review_synthetic_lesson(p_key text,p_lesson_id uuid,p_accept boolean,p_reason text) returns jsonb language sql security invoker set search_path='' as $$select ralph_private.workflow_command('REVIEW',p_key,jsonb_build_object('lesson_id',p_lesson_id,'accept',p_accept,'reason',p_reason))$$;
revoke all on function public.ralph_prepare_synthetic(text,numeric,numeric),public.ralph_approve_synthetic(text,uuid),public.ralph_complete_synthetic(text,uuid,numeric,numeric,text,timestamptz),public.ralph_review_synthetic_lesson(text,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.ralph_prepare_synthetic(text,numeric,numeric),public.ralph_approve_synthetic(text,uuid),public.ralph_complete_synthetic(text,uuid,numeric,numeric,text,timestamptz),public.ralph_review_synthetic_lesson(text,uuid,boolean,text) to authenticated;
commit;
