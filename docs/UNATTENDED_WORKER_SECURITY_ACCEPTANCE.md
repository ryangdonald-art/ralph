# Unattended worker security acceptance gate

**Status:** design and unit-test candidates only. No unattended worker is active.

## Host-enforced controls required before activation
1. Run each task in a disposable, nonprivileged sandbox with a read-only base image and strict writable workspace.
2. Scope GitHub credentials to a single repository and nonproduction branches. Explicitly deny merges, branch protection edits, repository settings, secrets, releases and workflow changes.
3. Do not mount production Render/Supabase credentials or other business secrets.
4. Enforce network egress allowlists; do not trust the model to self-report prohibited calls.
5. Set a host-enforced process timeout, CPU/memory limits and per-task cost cap. Cancel children on timeout.
6. Use durable atomic task claims with fencing tokens, idempotency and a transactional event ledger.
7. Never let an agent choose its own permissions, approve its own review or bypass required independent testing.
8. Only allow draft PR creation. A human must authorise merges, deployments, publishing, contracts, financial actions and material spending.
9. On a crash, stop safely, record failure, release or expire the lease and allow bounded retry without duplicate side effects.
10. Verify cross-tenant access denial against real authenticated database RLS; synthetic tenant labels are insufficient.
11. Record provider execution receipts from authenticated server adapters and measure actual costs and performance.
12. Configure and verify a kill switch before scheduling recurring work.

## Known prototype gaps
- `build-worker-policy.js` is a pure policy function, not host isolation.
- `build-dispatcher.js` checks elapsed time after executor return, not a hard process kill.
- `build-task-queue.js` is memory-only and not transactionally safe across processes.
- The provider router and adapter are not connected to live model APIs.
- The existing isolated branch has not passed an evidenced full repository CI run.
- The draft PR is not a production release candidate.

## Activation checklist
[ ] Owner-approved budget and provider data-sharing scope
[ ] Host isolation and permission audit
[ ] Durable authenticated queue and event store
[ ] Worker timeout and cancellation proof
[ ] Zero-production-write test
[ ] Tenant RLS and replay/idempotency tests
[ ] Full CI and security scan
[ ] Draft PR creation demonstration
[ ] Kill-switch demonstration
[ ] Owner approval to activate unattended scheduler

**Decision:** DO NOT ACTIVATE until all requirements are evidenced.
