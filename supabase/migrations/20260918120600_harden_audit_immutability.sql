-- RALPH 2.0 audit immutability hardening
-- Original signals and evidence are append-only for authenticated application roles.
-- Approval records are immutable after insertion.
-- Decisions may evolve via controlled UPDATE but may not be deleted.

drop policy if exists operator_admin_update_signals on public.signals;
drop policy if exists operator_admin_delete_signals on public.signals;
drop policy if exists operator_admin_update_evidence on public.evidence;
drop policy if exists operator_admin_delete_evidence on public.evidence;
drop policy if exists operator_admin_delete_decisions on public.decisions;
drop policy if exists admin_update_approvals on public.approvals;
