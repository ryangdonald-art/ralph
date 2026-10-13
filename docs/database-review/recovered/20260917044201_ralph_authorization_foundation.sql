create table if not exists public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_key text not null default 'dealworx' check (length(trim(organization_key)) > 0),
  role text not null check (role in ('ADMIN','OPERATOR','VIEWER')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_members enable row level security;
revoke all on table public.app_members from anon, authenticated;
grant select on table public.app_members to authenticated;

create policy app_members_select_self
on public.app_members
for select
to authenticated
using ((select auth.uid()) = user_id and active = true);

-- Replace temporary broad authenticated read policies with explicit active-membership authorization.
drop policy if exists authenticated_read_entities on public.entities;
drop policy if exists authenticated_read_signals on public.signals;
drop policy if exists authenticated_read_evidence on public.evidence;
drop policy if exists authenticated_read_investigations on public.investigations;
drop policy if exists authenticated_read_decisions on public.decisions;
drop policy if exists authenticated_read_actions on public.actions;
drop policy if exists authenticated_read_outcomes on public.outcomes;
drop policy if exists authenticated_read_agent_runs on public.agent_runs;
drop policy if exists authenticated_read_approvals on public.approvals;

create policy active_member_read_entities on public.entities for select to authenticated
using (exists (select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.active));
create policy active_member_read_signals on public.signals for select to authenticated
using (exists (select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.active));
create policy active_member_read_evidence on public.evidence for select to authenticated
using (exists (select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.active));
create policy active_member_read_investigations on public.investigations for select to authenticated
using (exists (select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.active));
create policy active_member_read_decisions on public.decisions for select to authenticated
using (exists (select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.active));
create policy active_member_read_actions on public.actions for select to authenticated
using (exists (select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.active));
create policy active_member_read_outcomes on public.outcomes for select to authenticated
using (exists (select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.active));
create policy active_member_read_agent_runs on public.agent_runs for select to authenticated
using (exists (select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.active));
create policy active_member_read_approvals on public.approvals for select to authenticated
using (exists (select 1 from public.app_members m where m.user_id = (select auth.uid()) and m.active));