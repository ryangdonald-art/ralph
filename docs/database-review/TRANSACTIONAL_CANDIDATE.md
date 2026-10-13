# Transactional synthetic workflow candidate

13 October 2026. **Local implementation and local proof only.** No live database DDL, paid service, production deployment, HTTP route enablement or owner authentication occurred.

## What is implemented

`transactional-workflow.sql` follows the recovered actual schema and the separate `proposed-preparation-repair.sql`. It introduces private command receipts, durable internal tasks and reviewable lessons. Four public SECURITY INVOKER wrappers forward narrowly defined commands to a private SECURITY DEFINER function:

| Command | Authority | Atomic result |
|---|---|---|
| ralph_prepare_synthetic | Active OPERATOR or ADMIN | Synthetic signal, source evidence, deterministic Sherlock/RAT/RALPH records, proposed decision, action awaiting approval, receipt |
| ralph_approve_synthetic | Active ADMIN | Human approval record, one assigned internal task, action result meaning task creation, receipt |
| ralph_complete_synthetic | Active assigned task owner | Observed synthetic recheck, recorded outcome, task completion, unreviewed lesson proposal, receipt |
| ralph_review_synthetic_lesson | Active ADMIN different from proposer | Explicit accept/reject, reviewer, review reason and timestamp, receipt |

Each subsequent preparation retrieves up to 20 REVIEWED lessons in the same organisation. Unreviewed/rejected lessons do not enter that context. A retrieved lesson changes the task recommendation and enforces a new completion requirement: the later task must supply an observation timestamp between task creation and the current database time. Missing, malformed and future timestamps are rejected. A valid timestamp allows completion. Lesson IDs are recorded in decision provenance and agent context. It does not modify owner instructions or financial authority.

The observed outcome is explicitly synthetic and ESTIMATED, with no realised financial value claim. Numeric recheck inputs are human-supplied observations linked to a source reference, not independently verified bank data. The action's EXECUTED state means that an internal task was durably created; task completion is recorded separately. There is no external payment, communication or contract execution capability.

## Security and transaction design

Direct application writes to all domain, approval, outcome, task and lesson tables are revoked. SELECT remains protected by active organisation membership. Each command derives its actor from auth.uid, reloads and locks current active membership, enforces role and organisation boundaries and validates allowed payload fields. Lesson self-review is rejected even for an administrator. Preparation requires a material synthetic gap of strictly above 25,000 and bounded nonnegative numeric inputs; unsupported command kinds and arbitrary extra request fields are rejected.

A private definer command is necessary here because granting ordinary table UPDATE/INSERT rights to callers would also permit bypassing the transactional approval path. The function lives in an unexposed schema, has an empty search_path and explicit schema references, and offers no dynamic SQL or arbitrary relation access. PUBLIC/anon execution is revoked. Only authenticated callers may execute its narrow dispatcher and the public invoker wrappers; the private function applies the same checks if directly called through a privileged SQL connection. Public wrappers do not elevate privileges themselves. The private schema must remain absent from PostgREST exposed schemas before any deployment.

The migration's trusted owner owns the function. Its definer privilege is powerful; this proposal still needs independent review, live schema reconciliation and security advisors before deployment. Service-role/database-owner mutation is outside the application-user protection boundary.

Organisation/request-key transaction advisory locks serialize duplicate keys; receipts bind command, exact JSONB payload and actor. Identical replay returns the stored response. Different payload, actor or command under that key fails. Action/task/lesson row locks and one-task-per-action / one-lesson-per-task constraints prevent repeated transitions under different keys. Fresh authorization checks run before replay. All command changes and the receipt commit together, or PostgreSQL rolls them back together.

## Evidence and limits

`validate-transactional.cjs` replays the six actual recovered migrations in disposable PGlite, applies the bounded repair and candidate, and uses isolated synthetic identities. `transactional-validation-result.json` records 31 passing checks. Failure injection demonstrates rollback after earlier preparation writes, approval insertion and completion/outcome writes. Role, cross-organisation, missing subject, anonymous, direct-write, conflicting replay, self-review and inactive membership tests pass. The database is closed and reopened; a later preparation retrieves the reviewed lesson and changes its recorded recommendation. Final cardinality remains exactly two tasks, approvals, outcomes and lesson proposals across two completed cycles despite duplicate requests.

Limitations: auth.users is simplified and auth.uid is emulated from a session setting. pgcrypto CREATE EXTENSION alone is skipped because PGlite provides native gen_random_uuid. No actual JWT, PostgREST, owner sign-in or production runtime has been exercised. PGlite uses one engine, so these tests prove sequential replay and rollback, not concurrent multi-session locking behaviour under production load. The separate Council outputs are distinct deterministic templates: Sherlock records source IDs and calculation, RAT records falsification/missing evidence/alternative hypothesis, and RALPH records decision/limits/lesson requirements. They are not independently reasoning models. Reviewed procedural retrieval is not a general autonomous learning engine.

Existing HTTP preparation/execution routes must stay paused. This file is review material, not an automatic migration, deployment instruction or proof that production is operational.

## Reproduction

Install PGlite in a disposable directory outside the application. Then:

```sh
RALPH_PGLITE_MODULE=/absolute/path/to/disposable/node_modules/@electric-sql/pglite node docs/database-review/validate-transactional.cjs
```

No package.json or runtime dependencies were changed. Official documentation used: https://supabase.com/docs/guides/database/functions and https://supabase.com/docs/guides/database/postgres/row-level-security.
