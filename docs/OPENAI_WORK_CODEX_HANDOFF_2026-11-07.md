# ADAM → OpenAI Work / Codex Cloud: RALPH engineering handoff
Date: 2026-11-07
Repository: https://github.com/ryangdonald-art/ralph
Review branch: `adam-gpt-council-build-2026-11-07`
Draft PR: https://github.com/ryangdonald-art/ralph/pull/3
State: HANDOFF PREPARED; NOT AN ACTIVE WORK/CODEX SESSION.

## Mission
Turn the isolated RALPH unattended-builder prototypes into a reproducibly tested, secure engineering foundation. Do not recreate historical assets or claim production readiness.

## Mandatory preflight
1. Read root `AGENTS.md`, `docs/OPERATING_RECORD.md`, `docs/UPGRADE_STATUS_2026-10-13.md`, `docs/ADAM_MASTER_BUILD_DIRECTIVE_2026-11-07.md`, `docs/ADAM_AI_ECOSYSTEM_INTELLIGENCE_DIRECTIVE_2026-11-07.md`, and `docs/ADAM_SUPREME_UNATTENDED_BUILD_DIRECTIVE_IMPLEMENTATION_2026-11-07.md`.
2. Read `docs/UNATTENDED_WORKER_SECURITY_ACCEPTANCE.md`, `docs/COUNCIL_BUILD_CHECKPOINT_2026-11-07.md`, and the current draft PR diff.
3. Confirm the actual checked-out branch and the production auto-deploy branch list. Do not push to `main` or `ralph-2-foundation`.
4. Use a new isolated task branch from the review branch if required by Codex; do not merge or deploy.

## First bounded engineering assignment
**Objective:** Obtain real execution evidence and correct defects in the existing unattended task queue, dispatcher, provider adapters and Council tests.

1. Run `npm ci`, `npm test` and `npm run check` in an isolated environment; record exact command, environment, revision, exit status and failing tests.
2. Correct actual test failures, with regression tests. Do not claim pass without output.
3. Test lease fencing, duplicate execution, tenant separation, missing approval, malformed provider receipts, execution timeouts and failure recovery.
4. Review the SQL candidates under `supabase/candidates/` for correctness and tenant integrity. Do not apply any migration or restore any database.
5. Review the worker security checklist; identify which protections are only declared rather than enforced. Never treat model-generated flags as a security boundary.
6. Produce a concise evidence-backed report and a draft PR or updates to the existing review branch, with remaining blockers.

## Hard limits
- No production merge, deploy, database change, payment, contract, external publication, secrets exposure or provider data transmission.
- No API calls to paid external AI providers without separately approved budget and data handling.
- No unattended scheduled execution until host isolation, credentials, budget, kill switch and audit controls are verified and authorised.
- Do not claim standalone GPTs are callable through the API without an actual supported integration.
- Do not rewrite approved owner master instructions.

## Acceptance evidence
A completed assignment must provide a commit SHA, actual test outputs, a defect/fix ledger, clear security status, and a human-review-only pull request. A coding-agent plan alone is not completion.

## Operator instructions
In ChatGPT, open Work or the Codex environment available to your account. Connect/select the existing GitHub repository and paste this file as the task. Use only the isolated review branch. Confirm any requested connector permissions explicitly in the UI. Do not infer that this file launches a background agent.
