-- LOCAL REVIEW PROPOSAL ONLY. Changes access controls: separate deployment review required.
-- Matches recovered migrations through 20260918120632. Preserve migration history.
-- Intended for synthetic preparation only; execution remains disabled.
-- Validating FKs fails closed if existing cross-organization corruption exists.
begin;
alter table public.entities add constraint entities_org_id_unique unique(organization_key,id);
alter table public.signals add constraint signals_org_id_unique unique(organization_key,id);
alter table public.evidence add constraint evidence_org_id_unique unique(organization_key,id);
alter table public.investigations add constraint investigations_org_id_unique unique(organization_key,id);
alter table public.decisions add constraint decisions_org_id_unique unique(organization_key,id);
alter table public.actions add constraint actions_org_id_unique unique(organization_key,id);
alter table public.approvals add constraint approvals_org_id_unique unique(organization_key,id);
alter table public.outcomes add constraint outcomes_org_id_unique unique(organization_key,id);
alter table public.agent_runs add constraint agent_runs_org_id_unique unique(organization_key,id);
alter table public.signals add constraint signals_entity_id_org_fk foreign key(organization_key,entity_id) references public.entities(organization_key,id) on delete restrict;
alter table public.evidence add constraint evidence_entity_id_org_fk foreign key(organization_key,entity_id) references public.entities(organization_key,id) on delete restrict;
alter table public.evidence add constraint evidence_signal_id_org_fk foreign key(organization_key,signal_id) references public.signals(organization_key,id) on delete restrict;
alter table public.investigations add constraint investigations_signal_id_org_fk foreign key(organization_key,signal_id) references public.signals(organization_key,id) on delete restrict;
alter table public.decisions add constraint decisions_investigation_id_org_fk foreign key(organization_key,investigation_id) references public.investigations(organization_key,id) on delete restrict;
alter table public.decisions add constraint decisions_signal_id_org_fk foreign key(organization_key,signal_id) references public.signals(organization_key,id) on delete restrict;
alter table public.actions add constraint actions_decision_id_org_fk foreign key(organization_key,decision_id) references public.decisions(organization_key,id) on delete restrict;
alter table public.approvals add constraint approvals_action_id_org_fk foreign key(organization_key,action_id) references public.actions(organization_key,id) on delete restrict;
alter table public.outcomes add constraint outcomes_decision_id_org_fk foreign key(organization_key,decision_id) references public.decisions(organization_key,id) on delete restrict;
alter table public.outcomes add constraint outcomes_action_id_org_fk foreign key(organization_key,action_id) references public.actions(organization_key,id) on delete restrict;
alter table public.agent_runs add constraint agent_runs_signal_id_org_fk foreign key(organization_key,signal_id) references public.signals(organization_key,id) on delete restrict;
alter table public.agent_runs add constraint agent_runs_investigation_id_org_fk foreign key(organization_key,investigation_id) references public.investigations(organization_key,id) on delete restrict;
alter table public.agent_runs add constraint agent_runs_decision_id_org_fk foreign key(organization_key,decision_id) references public.decisions(organization_key,id) on delete restrict;

-- Remove permissive mutation policies, retain recovered organization-scoped SELECT policies.
do $$ declare p record; begin
 for p in select policyname,tablename from pg_policies where schemaname='public'
 and tablename in ('entities','signals','evidence','investigations','decisions','actions','approvals','outcomes','agent_runs')
 and cmd <> 'SELECT' loop execute format('drop policy %I on public.%I',p.policyname,p.tablename); end loop;
end $$;
revoke insert,update,delete,truncate,references,trigger on public.entities from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.signals from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.evidence from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.investigations from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.decisions from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.actions from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.approvals from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.outcomes from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.agent_runs from public,anon,authenticated;
grant insert on public.signals to authenticated;
create policy signals_synthetic_prepare on public.signals for insert to authenticated
with check (created_by=(select auth.uid()) and exists (select 1 from public.app_members m
where m.user_id=(select auth.uid()) and m.active and m.role in ('ADMIN','OPERATOR')
and m.organization_key=signals.organization_key) and (status='OPEN' and source_system='RALPH_SYNTHETIC' and provenance @> '{"synthetic":true}'::jsonb));
grant insert on public.evidence to authenticated;
create policy evidence_synthetic_prepare on public.evidence for insert to authenticated
with check (created_by=(select auth.uid()) and exists (select 1 from public.app_members m
where m.user_id=(select auth.uid()) and m.active and m.role in ('ADMIN','OPERATOR')
and m.organization_key=evidence.organization_key) and (source_system='RALPH_SYNTHETIC' and provenance @> '{"synthetic":true}'::jsonb));
grant insert on public.investigations to authenticated;
create policy investigations_synthetic_prepare on public.investigations for insert to authenticated
with check (created_by=(select auth.uid()) and exists (select 1 from public.app_members m
where m.user_id=(select auth.uid()) and m.active and m.role in ('ADMIN','OPERATOR')
and m.organization_key=investigations.organization_key) and (status='COMPLETE' and confidence is null and provenance @> '{"synthetic":true}'::jsonb));
grant insert on public.decisions to authenticated;
create policy decisions_synthetic_prepare on public.decisions for insert to authenticated
with check (created_by=(select auth.uid()) and exists (select 1 from public.app_members m
where m.user_id=(select auth.uid()) and m.active and m.role in ('ADMIN','OPERATOR')
and m.organization_key=decisions.organization_key) and (status='PROPOSED' and confidence is null and provenance @> '{"synthetic":true}'::jsonb));
grant insert on public.actions to authenticated;
create policy actions_synthetic_prepare on public.actions for insert to authenticated
with check (created_by=(select auth.uid()) and exists (select 1 from public.app_members m
where m.user_id=(select auth.uid()) and m.active and m.role in ('ADMIN','OPERATOR')
and m.organization_key=actions.organization_key) and (status='AWAITING_APPROVAL' and action_type='REQUEST_INFO' and permission_level=3 and requested_action @> '{"synthetic":true,"kind":"REQUEST_INFO"}'::jsonb and execution_result is null and error_code is null));
grant insert on public.agent_runs to authenticated;
create policy agent_runs_synthetic_prepare on public.agent_runs for insert to authenticated
with check (created_by=(select auth.uid()) and exists (select 1 from public.app_members m
where m.user_id=(select auth.uid()) and m.active and m.role in ('ADMIN','OPERATOR')
and m.organization_key=agent_runs.organization_key) and (provider='DETERMINISTIC' and agent in ('SHERLOCK','RAT','RALPH') and confidence is null and output ->> 'reviewMethod'='DETERMINISTIC_TEMPLATE'));
commit;
