-- RALPH unattended builder: STAGING CANDIDATE ONLY. DO NOT APPLY TO PRODUCTION.
-- Requires authenticated server-side worker identity and tenant-scoped RLS testing.
create table if not exists public.ralph_build_tasks (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 kind text not null check (kind in ('inspect','test','lint','document','prototype','draft_pr')),
 priority integer not null default 5 check (priority between 0 and 10),
 state text not null default 'queued' check (state in ('queued','leased','completed','failed','blocked')),
 attempts integer not null default 0 check (attempts >= 0),
 max_attempts integer not null default 3 check (max_attempts between 1 and 3),
 lease_owner text,
 lease_until timestamptz,
 lease_token bigint not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint lease_consistency check (
   (state = 'leased' and lease_owner is not null and lease_until is not null)
   or (state <> 'leased' and lease_owner is null and lease_until is null)
 )
);
create index if not exists ralph_build_tasks_claim_idx on public.ralph_build_tasks(tenant_id,state,priority,created_at);
create table if not exists public.ralph_build_task_dependencies (
 task_id uuid not null references public.ralph_build_tasks(id),
 depends_on_task_id uuid not null references public.ralph_build_tasks(id),
 primary key(task_id,depends_on_task_id),
 check (task_id <> depends_on_task_id)
);
create table if not exists public.ralph_build_task_events (
 id bigint generated always as identity primary key,
 task_id uuid not null references public.ralph_build_tasks(id),
 tenant_id uuid not null,
 event_type text not null,
 lease_token bigint,
 recorded_at timestamptz not null default now(),
 metadata jsonb not null default '{}'::jsonb
);
create index if not exists ralph_build_task_events_tenant_idx on public.ralph_build_task_events(tenant_id,task_id,recorded_at);
alter table public.ralph_build_tasks enable row level security;
alter table public.ralph_build_task_events enable row level security;
alter table public.ralph_build_task_dependencies enable row level security;
-- Default deny: deliberately create NO policies. Direct clients cannot read/write.
revoke all on public.ralph_build_tasks from anon, authenticated;
revoke all on public.ralph_build_task_events from anon, authenticated;
revoke all on public.ralph_build_task_dependencies from anon, authenticated;
-- No SECURITY DEFINER worker functions in this candidate.
-- Claim/complete must later be implemented with an audited transactional server
-- function using authenticated tenant/worker identity and atomic fencing checks.
-- Tenant ID in the request body alone is NOT authorization.
