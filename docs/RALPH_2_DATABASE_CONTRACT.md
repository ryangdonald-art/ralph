# RALPH 2.0 — Minimum Database Contract

STATUS: PROPOSED ONLY. No migration has been executed. Supabase remains BLOCKED until the correct project is verified or creation is explicitly authorized.

All tables use UUID primary keys, `created_at timestamptz not null default now()`, `updated_at timestamptz`, and source provenance where applicable. Business rows must be scoped to an organization/company boundary before production RLS is enabled.

## entities
Purpose: company/customer/supplier/SKU/site or other subject RALPH reasons about.
Required: id, entity_type, name. Optional: external_ref, metadata. Index: entity_type/name, external_ref. RLS: organization scoped.

## signals
Purpose: deterministic/material event detected from source data.
Required: id, entity_id, signal_type, status, detected_at, source_type, source_ref. Optional: severity, exposure_amount, currency, detector_version, payload. FKs: entity_id→entities. Index: entity/status/detected_at, signal_type. RLS: organization scoped. Signals are append/audit sensitive.

## evidence
Purpose: immutable reference to facts used in investigation/decision.
Required: id, entity_id, evidence_type, source_type, source_ref, observed_at. Optional: payload, freshness_at, hash. FKs: entity_id→entities. Index: entity/observed_at, source_ref. RLS: organization scoped. Source evidence must not be overwritten by model inference.

## investigations
Purpose: Sherlock investigation of a signal.
Required: id, signal_id, status. Optional: anomaly, baseline, materiality, hypotheses, missing_information, confidence, economic_exposure. FKs: signal_id→signals. Index: signal/status. RLS: organization scoped.

## decisions
Purpose: RALPH management resolution.
Required: id, entity_id, output_type, summary, status. Optional: investigation_id, confidence, economic_impact_amount, economic_impact_currency, economic_impact_state. FKs: entity_id→entities, investigation_id→investigations. Index: entity/status/created_at. RLS: organization scoped. `output_type` constrained to ACTION/DECISION/ALERT/TASK/FOLLOW-UP/ESCALATION/KILL; impact state constrained to ESTIMATED/VERIFIED/REALIZED.

## actions
Purpose: controlled action requested from a decision.
Required: id, decision_id, action_type, requested_action, permission_level, status, idempotency_key. Optional: execution_status, execution_result, error, recovery_info. FKs: decision_id→decisions. Unique: idempotency_key. Index: decision/status. RLS: organization scoped.

## approvals
Purpose: immutable approval/rejection record for controlled execution.
Required: id, action_id, status, actor_id, decided_at. Optional: reason. FKs: action_id→actions. Index: action/decided_at. RLS: approver visibility/organization scoped. Never infer approval from model output.

## outcomes
Purpose: close loop against expected result.
Required: id, decision_id, actual_outcome, status. Optional: action_id, expected_outcome, variance, why, economic_impact_amount, currency, impact_state, lesson_proposal. FKs: decision_id→decisions, action_id→actions. Index: decision/status. RLS: organization scoped.

## agent_runs
Purpose: auditable model/agent execution record.
Required: id, agent, provider, model, started_at, status. Optional: signal_id, investigation_id, decision_id, input_ref, context_refs, tool_refs, output, confidence, duration_ms, token_usage, cost, error. Index: agent/started_at, signal_id, decision_id. RLS: privileged organization users. Secrets and raw credentials must never be stored.

## RLS intention
Before real business data: define tenant/organization ownership and roles; enable RLS on every business table; default deny; grant least privilege; server/service operations remain separately authorized. Authentication design must be verified before policies are deployed.

## Audit rules
Evidence, approvals, agent runs and execution records are audit-sensitive. Prefer append-only history for material state changes. Model output cannot promote ESTIMATED economic impact to VERIFIED/REALIZED; that transition requires evidence and an authorized human/system rule.
