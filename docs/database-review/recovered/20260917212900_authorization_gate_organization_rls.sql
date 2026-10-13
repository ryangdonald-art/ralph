do $$
declare t text;
begin
  foreach t in array array['entities','signals','evidence','investigations','decisions','actions','outcomes','agent_runs','approvals'] loop
    execute format('alter table public.%I add column if not exists organization_key text not null default %L check (length(trim(organization_key)) > 0)', t, 'dealworx');
    execute format('drop policy if exists active_member_read_%I on public.%I', t, t);
    execute format('drop policy if exists member_select_%I on public.%I', t, t);
    execute format('drop policy if exists operator_admin_insert_%I on public.%I', t, t);
    execute format('drop policy if exists operator_admin_update_%I on public.%I', t, t);
    execute format('drop policy if exists operator_admin_delete_%I on public.%I', t, t);
    execute format($p$create policy member_select_%I on public.%I for select to authenticated using (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=%I.organization_key))$p$, t,t,t);
  end loop;
end $$;

-- Operational tables: OPERATOR and ADMIN may mutate rows only in their own organisation.
do $$
declare t text;
begin
  foreach t in array array['entities','signals','evidence','investigations','decisions','outcomes'] loop
    execute format($p$create policy operator_admin_insert_%I on public.%I for insert to authenticated with check (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=%I.organization_key and m.role in ('OPERATOR','ADMIN')))$p$,t,t,t);
    execute format($p$create policy operator_admin_update_%I on public.%I for update to authenticated using (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=%I.organization_key and m.role in ('OPERATOR','ADMIN'))) with check (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=%I.organization_key and m.role in ('OPERATOR','ADMIN')))$p$,t,t,t,t);
    execute format($p$create policy operator_admin_delete_%I on public.%I for delete to authenticated using (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=%I.organization_key and m.role in ('OPERATOR','ADMIN')))$p$,t,t,t);
  end loop;
end $$;

-- Actions can be proposed/maintained by OPERATOR or ADMIN, but permission_level remains constrained to <=3 by table CHECK.
create policy operator_admin_insert_actions on public.actions for insert to authenticated with check (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=actions.organization_key and m.role in ('OPERATOR','ADMIN')));
create policy operator_admin_update_actions on public.actions for update to authenticated using (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=actions.organization_key and m.role in ('OPERATOR','ADMIN'))) with check (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=actions.organization_key and m.role in ('OPERATOR','ADMIN')));

-- Human approval is ADMIN-only at the database boundary.
create policy admin_insert_approvals on public.approvals for insert to authenticated with check (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=approvals.organization_key and m.role='ADMIN') and (approver_id is null or approver_id=(select auth.uid())));
create policy admin_update_approvals on public.approvals for update to authenticated using (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=approvals.organization_key and m.role='ADMIN')) with check (exists (select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.active and m.organization_key=approvals.organization_key and m.role='ADMIN') and (approver_id is null or approver_id=(select auth.uid())));

-- Agent runs are server-written only; authenticated clients have read-only RLS access.

-- Membership is self-readable only; all client-side membership mutation stays denied.
drop policy if exists app_members_select_self on public.app_members;
create policy app_members_select_self on public.app_members for select to authenticated using ((select auth.uid())=user_id and active=true);

revoke all on public.app_members from anon, authenticated;
grant select on public.app_members to authenticated;

revoke all on public.entities, public.signals, public.evidence, public.investigations, public.decisions, public.actions, public.outcomes, public.agent_runs, public.approvals from anon, authenticated;
grant select on public.entities, public.signals, public.evidence, public.investigations, public.decisions, public.actions, public.outcomes, public.agent_runs, public.approvals to authenticated;
grant insert, update, delete on public.entities, public.signals, public.evidence, public.investigations, public.decisions, public.outcomes to authenticated;
grant insert, update on public.actions, public.approvals to authenticated;