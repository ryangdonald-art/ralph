# Controlled workflow: local proof and production boundary

Date: 13 October 2026. This is an offline deterministic simulation. It is not a deployed RALPH loop, independent model review, real human approval, authenticated multi-user service or verified commercial learning.

## Changes

The legacy `approveAndExecute` implementation used separate REST calls to insert approval, mark an action executed and insert a synthetic outcome. There was no proven atomic command, durable task completion or verified result. It now returns a useful 503 error before touching storage. Read-only analysis remains available. Synthetic preparation is also paused after restored permissions proved the current sequence would write five records before a denied agent_runs INSERT. A zero-access regression prevents partial chains. Existing prepared records are not deleted or altered by this change.

Fixed 0.98/0.94 confidence values are replaced with `null` and explicit `DETERMINISTIC_TEMPLATE` metadata. They were constants, not calibrated estimates. A live schema may reject nullable confidence; establish schema compatibility in an authorised staging environment before rollout. Do not reinstate invented confidence to bypass schema validation.

The new `ControlledWorkflow` creates a local evidence-backed case, runs the deterministic cash-flow review, requires an explicit fixture approval, creates a real local task record, records its scripted completion and synthetic observation, proposes a constrained lesson, requires a different fixture reviewer, and applies the reviewed lesson to a later case. Lesson scope is limited to asking for timestamped bank/payment evidence. It does not change thresholds, permission level, access rules or owner instructions. The later decision still awaits approval.

All actors and observation references in the demonstration are fixtures. They do not authenticate people or verify real bank statements. The model does not learn weights or rewrite its governing instructions.

## Reproduce

```sh
node --test test/controlledWorkflow.test.js
node scripts/controlled-workflow-demo.js /tmp/ralph-synthetic-proof.json
node scripts/controlled-workflow-demo.js /tmp/ralph-synthetic-proof.json
```

Use a new state filename for an independent demonstration. Reusing the same file replays the same case IDs and creates no duplicate tasks, outcomes or review events. The output identifies the simulation, shows unchanged R150,000 liquidity exposure, the more specific later task, and the remaining approval requirement. A regression test also starts a fresh Node process to read the approved lesson and create the later case.

## Verified boundaries

Twelve dedicated tests cover blocked legacy execution, null deterministic confidence, invalid stage order, case replay and conflicting evidence, concurrent task creation, failure before commit, outcome replay/conflict, reviewed-lesson retrieval in another OS process, rejected/self-reviewed lessons, orphaned locks, corrupt state and conflicting actor/reason replays. Sixteen valid-JSON corruption cases exercise revision validation, stage invariants, duplicate identifiers, input hashes, deterministic analysis, constrained lesson integrity and ordered evidence events. State is validated both on load and before commit. This detects inconsistent snapshots; it is not cryptographic protection against a local attacker who rewrites the entire file consistently.

Local writes use an exclusive lock file, a synced temporary file and same-directory rename. Concurrent writers fail with `WORKFLOW_BUSY` and may retry after the writer finishes. Changes within a command are committed together; injected pre-commit failures leave the prior snapshot unchanged. Task IDs and events survive restart. There are no network effects to reconcile.

This is a small local persistence mechanism, not a distributed transaction system. It assumes a filesystem supporting exclusive creation and atomic same-directory rename. It does not guarantee power-loss durability on every filesystem, multi-host safety, encrypted storage, tamper-proof history or protection from a local user editing the JSON. File permissions are restricted to the owner where supported. An orphan lock is never automatically stolen: inspect running processes and preserve evidence before manual recovery. A crash after rename may commit the command without returning success; replaying it is safe for the tested operations.

## Production acceptance still required

1. Establish the complete deployed database schema, nullable field compatibility, migrations and rollback.
2. Prove authenticated organisation membership, role enforcement and cross-organisation isolation against a real staging database.
3. Implement a transactional approval/task command with uniqueness constraints, bounded idempotency, durable task identity and appropriate authorisation.
4. Prove concurrent commands, partial failures, timeout replay and recovery against that database.
5. Integrate a real task completion mechanism and validate outcome evidence; distinguish observations from realised financial benefit.
6. Require authenticated lesson review, provenance, versioning and constrained application to later decisions.
7. If adding model reviewers, run separate traced invocations, validate structured outputs, evaluate factual performance and keep permission controls in deterministic code.
8. Complete staging verification and obtain the required deployment decision before enabling live execution.

No database, production deployment, external message, purchase or real financial action was performed for this proof.
