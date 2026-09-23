# RALPH 2.0 — Foundation Architecture Audit

## Status — 2026-09-16
The foundation boundary is now implemented on `ralph-2-foundation`. This document distinguishes VERIFIED, PROPOSED and BLOCKED capability. Nothing in this document implies production readiness where authentication, real persistence or runtime verification is absent.

## VERIFIED
- Node/Express application with static frontend.
- Existing JSON data for deals, signals and posts remains intact as temporary persistence/seed material.
- Express routes are wired through service and repository boundaries; business routes no longer directly perform filesystem persistence.
- JSON filesystem access is isolated to `src/repositories/jsonRepository.js`.
- Central configuration rejects storage providers other than `json`; Supabase cannot be falsely selected as working.
- Deal validation is reusable and rejects malformed/oversized input rather than silently truncating it.
- Request IDs are generated for HTTP requests and returned in `X-Request-ID`; arbitrary inbound IDs are not trusted yet.
- Structured JSON telemetry exists with key-based secret redaction.
- Safe application error responses include error code, safe message and request ID; stack traces are not returned by the application error handler.
- Frontend rendering was hardened to avoid injecting untrusted API/user values through `innerHTML`.
- Temporary JSON writes use a write-then-rename strategy and corrupted/missing/non-array JSON fails loudly rather than becoming an empty dataset.
- Deterministic Cash Flow Danger logic exists and is not exposed as production intelligence in the UI.
- Cash detector keeps cash, receivables, overdue receivables, forecasts and commitments distinct. Only explicitly `COMMITTED` production requirements enter the immediate liquidity requirement; FORECAST and unknown-status production requirements remain separate.
- V1 permission contracts cap material execution at Level 3 (execute with approval); Level 4 is blocked by the domain contract.
- Approval/idempotency guard, RALPH/Sherlock/RAT contracts and database contract exist.
- Node test suite exists and has been expanded for cash distinctions, validation and corrupt JSON behavior.

## VERIFIED LIMITATIONS / RISKS
- Authentication and authorization are not implemented. `POST /api/deals` is therefore DEVELOPMENT / NOT PRODUCTION SAFE.
- JSON persistence is synchronous and local-file based. It is not production-grade durable/concurrent storage.
- ID allocation for deals is derived from current JSON rows and is not concurrency safe.
- Request IDs are generated locally only; trusted upstream propagation policy is not implemented.
- Telemetry is local stdout/stderr only and has no durable audit sink.
- Agent contracts exist, but there is no live AI provider/model execution.
- Cash detector uses synthetic/controlled inputs only; no real financial source provenance or freshness enforcement is connected.
- Existing `src/main.py` appears unrelated to the Node runtime and remains for later dead-code confirmation/removal; it has not been deleted.
- Repository is public; no secrets should ever be committed. Real Dealworx/DRM business data must not be placed in the public repository.

## TEST STATUS
COMMITTED BUT NOT RUNTIME VERIFIED in this execution environment.

A runtime checkout attempt could not reach GitHub from the execution container, so `npm ci`, `npm test`, `npm run check`, startup and endpoint smoke tests have not been honestly claimed as passed. The code/test changes remain reviewable in the draft PR and require an environment with repository checkout/network access for the quality gate.

## CASH DETECTOR STATUS
VERIFIED BY CODE REVIEW / COMMITTED, NOT RUNTIME VERIFIED.

Economic invariants encoded:
- cash != revenue
- cash != profit
- receivable != cash
- not-yet-due receivable != overdue receivable
- forecast payment != committed payment
- unknown receipt date remains unknown
- duplicate liability IDs count once
- production requirement affects immediate liquidity only when explicitly COMMITTED
- forecast/unknown production requirements remain separately visible

The detector must remain off the production UI until source provenance, freshness, testing and the auditable closed loop exist.

## STORAGE STATUS
TEMPORARY JSON ONLY. Route → service → repository separation is now in place so a future Supabase repository can replace JSON without rewriting business routes/domain logic. JSON files must remain until migration is verified.

## SUPABASE STATUS
BLOCKED. The connected Supabase context previously exposed no RALPH project. No project, migration or paid infrastructure has been created or modified.

## AUTH STATUS
BLOCKED / NOT PRODUCTION READY. Authentication, authorization and RLS belong to the next architecture gate with Supabase/real persistence.

## AI PROVIDER STATUS
PROPOSED / NOT CONNECTED. Agent/provider contracts exist; no OpenAI, Anthropic or Google model execution is claimed.

## Proposed V1 closed loop
```text
REAL DATA
  ↓
VALIDATION / PROVENANCE
  ↓
POSTGRES / SUPABASE
  ↓
CASH FLOW DANGER
  ↓
SHERLOCK
  ↓
RAT
  ↓
RALPH
  ↓
HUMAN APPROVAL
  ↓
CONTROLLED ACTION
  ↓
OUTCOME
  ↓
LEARN / ECONOMIC VALUE
```

## Minimum proposed database model
- `entities`
- `signals`
- `evidence`
- `investigations`
- `decisions`
- `actions`
- `outcomes`
- `agent_runs`
- `approvals`

The detailed proposed contract is in `docs/RALPH_2_DATABASE_CONTRACT.md`. Vector storage remains excluded until a demonstrated retrieval requirement exists.

## Security baseline before real data
- server-side secrets only
- authenticated users
- least privilege
- RLS on business data
- schema validation
- safe DOM rendering/output encoding
- auditable action and approval records
- external content treated as untrusted
- tool authorization separate from model reasoning
- idempotency for executable actions
- no real sensitive business data committed to the public repository

## STOP CONDITION
Feature expansion stops here. Do not add more detectors, specialist agents, vector memory, MCP, browser/computer automation, complex dashboards, multi-model routing, Temporal or LangGraph.

## NEXT ARCHITECTURE GATE
SUPABASE + AUTHENTICATION + REAL PERSISTENCE.

Cross this gate only when either:
1. the correct existing RALPH Supabase project is visible and can be inspected safely; or
2. Ryan explicitly authorizes creation of a new project after plan/cost implications are established.

Before connecting real Dealworx/DRM data, the committed quality gate must also be executed successfully in a runtime-capable environment.

## Definition of first production success
RALPH 2.0 succeeds only when one traceable real-data case completes:

REAL DATA → DETECT → SHERLOCK → RAT → RALPH → HUMAN APPROVAL → ACTION → OUTCOME → LEARN

and the evidence, disagreement, decision, approval, result and economic impact remain auditable without fabricated data.