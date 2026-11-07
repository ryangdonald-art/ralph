# RALPH Council — build checkpoint (2026-11-07)

Branch: `adam-gpt-council-build-2026-11-07` (isolated; no Render auto-deploy).
Draft PR: https://github.com/ryangdonald-art/ralph/pull/3

## Implemented on branch
- Council registry: named role catalogue, task routing, reviewer attestation shape and objection severity.
- Evidence Auditor: source-attestation structural checks. **Does not read or independently verify sources.** `independent` is a caller-supplied field and must not be mistaken for provenance proof.
- Council evidence gate: combines evidence defects and unresolved Council objections; never grants human approval.
- Specialist runner: injected adapter with structured output and failure handling; **not a connected model provider**.
- Legacy Council workflow: in-memory illustrative composition; its completed status is **not proof of provider execution**.
- Tracked Council: requires an externally supplied independent provider verifier before it marks an execution verified; records flat run events in an in-memory append-only test ledger. Rejects unconfigured, failed and unverified specialists; validates evidence package before any run.

## Verification status
The test files contain regression cases for all modules. **A complete npm test / CI run on this branch has not been verified.** The existing GitHub Actions workflow only runs for pushes to `ralph-2-foundation` or `ralph-upgrade-2026-10-13`, or PRs targeting `main` or `ralph-2-foundation`; this draft PR targets `ralph-upgrade-2026-10-13`. Do not claim CI passed. The current connector returned no commit status checks or workflow runs for the inspected revision.

## Security and engineering blockers
1. No trusted model-provider credentials, independent execution receipts or verified provider adapters.
2. In-memory ledger is not durable, authenticated, tamper-evident or tenant-isolated.
3. Supabase RALPH 2.0 currently reports INACTIVE; read-only table inspection failed. No restoration authorised.
4. No verified live RLS or transactional approval integration.
5. Existing production Render services auto-deploy their tracked branches; do not merge without explicit owner release approval.
6. No complete Custom GPT configuration export inventory.
7. The Council's structural evidence gate cannot certify truth from user-provided source metadata; it must be integrated with a genuine source-retrieval/verification service.

## Required next safe work
- Establish reproducible full test execution on isolated branch without unapproved costs.
- Define a provider-neutral signed execution receipt and trusted verification adapter.
- Implement tenant-scoped durable event storage in staging after approval and database availability.
- Recover GPT configurations and build held-out benchmark cases.
- Reconcile the old illustrative workflow with the tracked fail-closed workflow before production integration.

## Release state
**NOT DEPLOYABLE.** No production change, merge, paid infrastructure creation or Level-4 autonomy is authorised.
