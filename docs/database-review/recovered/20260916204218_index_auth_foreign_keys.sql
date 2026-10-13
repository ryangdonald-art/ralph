create index actions_created_by_idx on public.actions(created_by);
create index agent_runs_created_by_idx on public.agent_runs(created_by);
create index decisions_created_by_idx on public.decisions(created_by);
create index entities_created_by_idx on public.entities(created_by);
create index evidence_created_by_idx on public.evidence(created_by);
create index investigations_created_by_idx on public.investigations(created_by);
create index outcomes_created_by_idx on public.outcomes(created_by);
create index signals_created_by_idx on public.signals(created_by);