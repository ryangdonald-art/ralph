create extension if not exists pgcrypto;

create table public.entities (
 id uuid primary key default gen_random_uuid(),
 entity_type text not null check (entity_type <> ''),
 name text not null check (name <> ''),
 external_ref text,
 source_system text not null default 'RALPH',
 source_ref text,
 provenance jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index entities_source_external_uidx on public.entities(source_system, external_ref) where external_ref is not null;
create index entities_type_idx on public.entities(entity_type);

create table public.signals (
 id uuid primary key default gen_random_uuid(),
 entity_id uuid references public.entities(id) on delete restrict,
 signal_type text not null check (signal_type <> ''),
 status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','CLOSED','DISMISSED')),
 severity text not null default 'MATERIAL' check (severity in ('INFO','MATERIAL','HIGH','CRITICAL')),
 summary text not null check (summary <> ''),
 detected_at timestamptz not null default now(),
 source_system text not null,
 source_ref text,
 provenance jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index signals_entity_idx on public.signals(entity_id);
create index signals_status_detected_idx on public.signals(status, detected_at desc);

create table public.evidence (
 id uuid primary key default gen_random_uuid(),
 signal_id uuid references public.signals(id) on delete restrict,
 entity_id uuid references public.entities(id) on delete restrict,
 evidence_type text not null check (evidence_type <> ''),
 source_system text not null,
 source_ref text,
 observed_at timestamptz,
 payload jsonb not null,
 content_hash text,
 provenance jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create index evidence_signal_idx on public.evidence(signal_id);
create index evidence_entity_idx on public.evidence(entity_id);
create index evidence_source_idx on public.evidence(source_system, source_ref);

create table public.investigations (
 id uuid primary key default gen_random_uuid(),
 signal_id uuid not null references public.signals(id) on delete restrict,
 status text not null default 'OPEN' check (status in ('OPEN','INSUFFICIENT_EVIDENCE','COMPLETE','CANCELLED')),
 anomaly text,
 baseline text,
 materiality text,
 supporting_evidence jsonb not null default '[]'::jsonb,
 contradictory_evidence jsonb not null default '[]'::jsonb,
 hypotheses jsonb not null default '[]'::jsonb,
 missing_information jsonb not null default '[]'::jsonb,
 economic_exposure numeric(18,2),
 currency char(3) not null default 'ZAR',
 confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
 provenance jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index investigations_signal_idx on public.investigations(signal_id);
create index investigations_status_idx on public.investigations(status);

create table public.decisions (
 id uuid primary key default gen_random_uuid(),
 investigation_id uuid references public.investigations(id) on delete restrict,
 signal_id uuid references public.signals(id) on delete restrict,
 output_type text not null check (output_type in ('ACTION','DECISION','ALERT','TASK','FOLLOW-UP','ESCALATION','KILL')),
 status text not null default 'PROPOSED' check (status in ('PROPOSED','APPROVED','REJECTED','SUPERSEDED','CLOSED')),
 summary text not null check (summary <> ''),
 rationale text,
 confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
 provenance jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index decisions_investigation_idx on public.decisions(investigation_id);
create index decisions_signal_idx on public.decisions(signal_id);
create index decisions_status_idx on public.decisions(status);

create table public.actions (
 id uuid primary key default gen_random_uuid(),
 decision_id uuid not null references public.decisions(id) on delete restrict,
 action_type text not null check (action_type <> ''),
 requested_action jsonb not null,
 permission_level smallint not null check (permission_level between 0 and 3),
 status text not null default 'PENDING' check (status in ('PENDING','AWAITING_APPROVAL','APPROVED','REJECTED','EXECUTING','EXECUTED','FAILED','CANCELLED')),
 idempotency_key text not null unique,
 execution_result jsonb,
 error_code text,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index actions_decision_idx on public.actions(decision_id);
create index actions_status_idx on public.actions(status);

create table public.outcomes (
 id uuid primary key default gen_random_uuid(),
 action_id uuid references public.actions(id) on delete restrict,
 decision_id uuid not null references public.decisions(id) on delete restrict,
 outcome_type text not null check (outcome_type <> ''),
 summary text not null check (summary <> ''),
 economic_amount numeric(18,2) check (economic_amount is null or economic_amount >= 0),
 currency char(3) not null default 'ZAR',
 economic_state text check (economic_state is null or economic_state in ('ESTIMATED','VERIFIED','REALIZED')),
 evidence_refs jsonb not null default '[]'::jsonb,
 measured_at timestamptz,
 provenance jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create index outcomes_action_idx on public.outcomes(action_id);
create index outcomes_decision_idx on public.outcomes(decision_id);
create index outcomes_economic_state_idx on public.outcomes(economic_state);

create table public.agent_runs (
 id uuid primary key default gen_random_uuid(),
 agent text not null check (agent in ('RALPH','SHERLOCK','RAT','EXECUTION')),
 provider text not null,
 model text not null,
 signal_id uuid references public.signals(id) on delete restrict,
 investigation_id uuid references public.investigations(id) on delete restrict,
 decision_id uuid references public.decisions(id) on delete restrict,
 input_refs jsonb not null default '[]'::jsonb,
 context_refs jsonb not null default '[]'::jsonb,
 tools jsonb not null default '[]'::jsonb,
 output jsonb,
 confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
 duration_ms integer check (duration_ms is null or duration_ms >= 0),
 input_tokens integer check (input_tokens is null or input_tokens >= 0),
 output_tokens integer check (output_tokens is null or output_tokens >= 0),
 cost_amount numeric(18,6) check (cost_amount is null or cost_amount >= 0),
 cost_currency char(3) default 'USD',
 error_code text,
 error_message text,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 created_by uuid references auth.users(id)
);
create index agent_runs_signal_idx on public.agent_runs(signal_id);
create index agent_runs_investigation_idx on public.agent_runs(investigation_id);
create index agent_runs_decision_idx on public.agent_runs(decision_id);
create index agent_runs_started_idx on public.agent_runs(started_at desc);

create table public.approvals (
 id uuid primary key default gen_random_uuid(),
 action_id uuid not null references public.actions(id) on delete restrict,
 status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','REVOKED')),
 approver_id uuid references auth.users(id),
 approval_timestamp timestamptz,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index approvals_action_idx on public.approvals(action_id);
create index approvals_approver_idx on public.approvals(approver_id);

alter table public.entities enable row level security;
alter table public.signals enable row level security;
alter table public.evidence enable row level security;
alter table public.investigations enable row level security;
alter table public.decisions enable row level security;
alter table public.actions enable row level security;
alter table public.outcomes enable row level security;
alter table public.agent_runs enable row level security;
alter table public.approvals enable row level security;

revoke all on table public.entities, public.signals, public.evidence, public.investigations, public.decisions, public.actions, public.outcomes, public.agent_runs, public.approvals from anon, authenticated;

grant select on table public.entities, public.signals, public.evidence, public.investigations, public.decisions, public.actions, public.outcomes, public.agent_runs, public.approvals to authenticated;

create policy entities_authenticated_read on public.entities for select to authenticated using ((select auth.uid()) is not null);
create policy signals_authenticated_read on public.signals for select to authenticated using ((select auth.uid()) is not null);
create policy evidence_authenticated_read on public.evidence for select to authenticated using ((select auth.uid()) is not null);
create policy investigations_authenticated_read on public.investigations for select to authenticated using ((select auth.uid()) is not null);
create policy decisions_authenticated_read on public.decisions for select to authenticated using ((select auth.uid()) is not null);
create policy actions_authenticated_read on public.actions for select to authenticated using ((select auth.uid()) is not null);
create policy outcomes_authenticated_read on public.outcomes for select to authenticated using ((select auth.uid()) is not null);
create policy agent_runs_authenticated_read on public.agent_runs for select to authenticated using ((select auth.uid()) is not null);
create policy approvals_authenticated_read on public.approvals for select to authenticated using ((select auth.uid()) is not null);
