# RALPH reconstruction — reviewable upgrade

Owner authority: Ryan Graham Donald's master reconstruction directive, 12 October, reaffirmed 13 October 2026. Baseline: `042b031ea6bbc30e3967c416e0ab653ee2edcfad`. Changes belong on the isolated `ralph-upgrade-2026-10-13` branch. No merge or deployment is authorised by a local pass.

## Evidence and changes

### Latest memory and transactional candidate

The current application suite passes 87 tests, including 13 new scoped-memory and integration cases. All 94 recovered register entries are preserved with their original evidence labels; only explicitly selected standing instructions and labelled current-directive interpretations become active. Fresh-process retrieval, historical scoring exclusion, personal-format override boundaries, injected-source non-promotion and archive corruption rejection are tested. Repository working instructions load this record before substantive work. This is not universal ChatGPT recall or a business-data retrieval service.

The separate transactional SQL candidate implements atomic synthetic preparation, ADMIN approval, durable internal-task creation, assigned completion, observed synthetic outcome, separately reviewed lesson and later retrieval. The later lesson adds an enforced observation-timestamp requirement without changing approval authority. Distinct deterministic reviewer records are not independently reasoning models. See the transactional candidate report for isolated test results and exact limitations. Neither SQL proposal is applied and existing HTTP write routes remain paused.

### Earlier repair baseline

Baseline: 37 tests passed, including a test that incorrectly counted an unpaid receipt due today as liquidity. Candidate after restored-schema follow-up: 74 tests passed locally, plus complete JavaScript syntax checks. A separate review agent reran and confirmed the same results. Local Node version is 24.19.0; CI remains pinned to Node 20. The tests establish the bounded behaviours below, not production readiness.

| Capability / defect | Change and evidence | Remaining boundary |
|---|---|---|
| Cash versus receivables | Available liquidity is bank cash only; due/unpaid and paid-double-count regressions | Bank freshness/provenance not connected |
| Conflicting evidence | Same-ID material conflicts reject; exact duplicates count once; invalid thresholds reject | Upstream source reconciliation remains required |
| Physical evidence | Structured value/unit/source checks; blanks/nonfinite/invalid counts reject | Sources and physical safety need specialist verification |
| Permission levels | Executor requires Level 3 and boolean approval; lower levels cannot execute | Real authenticated approval still requires database integration |
| Organisation scope | Legacy JSON restricted to Dealworx; missing organisation rejected; REST reads/writes scoped | Mocked HTTP tests are not real RLS proof |
| Unsafe live execution | Separate-call approve/execute path now returns explanatory 503 before storage access | Transactional authenticated implementation required |
| Review confidence | Fixed confidence replaced by null; templates labelled deterministic | Check nullable fields against live schema before deployment |
| Controlled workflow | Local synthetic evidence, fixture approval, local task, completion, outcome, reviewed lesson and later application | Fixture actors, not live human identity or business results |
| Replay/recovery | Exclusive writer, atomic snapshot, stage/state validation, conflict rejection and failure tests | Single-host filesystem assumptions; no tamper-proof or distributed guarantee |
| LinkedIn delivery | Offline exact-text count, review hashes, fact-status/source requirements, hook reuse and experience gates | Human truth/voice judgment still needed; attestations can be wrong |
| Phone surface | Queue failures are unknown, not empty; execution visibly paused; synthetic preparation visibly paused for all roles | Browser interaction and real sign-in not verified here |
| Documentation/CI | Historical status explicitly superseded; new modules included in syntax checks; isolated branch CI enabled | CI result must be checked at its exact revision |

## Run and reproduce

```sh
npm ci
npm test
npm run check
npm run demo:loop -- /tmp/ralph-proof.json
npm run demo:loop -- /tmp/ralph-proof.json
```

The demo reports 2 cases, 7 events, one locally completed task, unchanged R150,000 exposure and a later recommendation requesting timestamped verification evidence. Replaying must not create duplicate tasks/events. The fresh-process regression establishes narrow lesson retrieval; it does not establish general ChatGPT memory.

For the editorial checker call `editorialGate` in `src/services/editorialGate.js` with final text, a fact ledger, review attestations bound to the exact SHA-256 text hash, historical hooks and task-specific exceptions. See its test fixture. `CHECKS_PASSED` is deliberately not `READY_TO_PUBLISH`. Counts use conservative UTF-16 units including whitespace. It does not browse, fact-check, publish or execute models.

## Current runtime and release gate

Read-only inspection found the phone web process deployed at the baseline commit and responding to health requests, with anonymous attention access denied. Supabase has now been restored to ACTIVE_HEALTHY. Ten public tables, six migrations and an active Dealworx administrator membership were recovered. Null confidence is compatible. Synthetic preparation is now fail-closed before writes because authenticated agent_runs insertion is denied; the previous sequence could partially persist five records. Real database policies still require reviewed hardening and atomic workflow commands. Both existing Render services auto-deploy commits to their tracked branches (`ralph-2-foundation` and `main`). Therefore publish changes only to the isolated review branch; a merge into the tracked foundation branch can cause a deployment.

Before any production release:

1. Obtain the required decision to restore the identified database, with current cost/retention implications established first. Do not create a substitute project or silently change billing.
2. Recover schema/migration/RLS/grant evidence and backups; reconcile the proposed contract with actual tables, including confidence nullability.
3. Prove real authorised sign-in, role permissions and cross-organisation denial in staging using approved synthetic data.
4. Implement/test an atomic database approval and task transition, durable completion and reviewed lesson flow. Do not enable the disabled endpoint with a process-local mutex.
5. Verify the mobile UI against the staging service and establish backup restoration, failure recovery and rollback.
6. Obtain approval for the exact reviewed revision and deployment effect before merging to an auto-deploy branch.

## Recovery and maintenance

Keep the production baseline unchanged until release gates pass. Roll back application code by deploying an explicitly approved known-good revision; database changes need their own tested rollback or forward-repair plan. None are included in this patch.

For local synthetic storage, preserve the snapshot before diagnosis. Invalid JSON, invalid state or an orphan lock must fail closed. Confirm no writer exists before manually removing a stale lock. Restore only a verified synthetic snapshot and replay the command. Never describe this local storage as suitable for confidential production records.

The old in-memory `ExecutionGuard` remains a legacy synchronous helper, not the production concurrency mechanism. No new live route uses it. All live execution remains disabled pending the transactional implementation.

## Decisions and unresolved backlog

- D-01: repair existing code rather than replace the stack; retain baseline interfaces where safe.
- D-02: block unsafe execution instead of presenting separate REST writes as atomic.
- D-03: implement a dependency-free local proof while the database is unavailable; label every actor/output synthetic.
- D-04: keep reviewer confidence uncalibrated/null until measured; do not invent values for schema convenience.
- D-05: prevent existing auto-deploy branches from receiving this work without approval.
- D-06: keep OpenAI API integration unconnected until credentials, budget, data scope and a successful evaluated invocation exist.
- Remaining: production auth/RLS, complete migrations, transactional commands, actual task completion, OpenAI runner/evaluations, broad memory, source freshness, independent editorial-quality benchmark and live mobile acceptance.
