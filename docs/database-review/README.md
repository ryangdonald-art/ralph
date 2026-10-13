# Recovered database schema and bounded repair proposal

Date: 13 October 2026. No live schema or access-control changes were made by this review.

After restoration settled, the project exposed ten public tables and one auth user. Earlier empty-table responses during restoration were provisional and must not be used to justify a new schema. The superseded bootstrap proposal was moved outside the repository.

## Historical recovery

`recovered/` contains the six recovered migration records, ordered by their original version. Each file preserves the original statements, joined in order. These are archival evidence, not automatically replayed migrations. In particular, the recovered hardening record is version **20260918120632**; the existing repository migration filename is **20260918120600**. Reconcile migration history before adopting these into the automatic migration directory. Do not apply duplicate DDL or fabricate historical records.

## Reproduced defects

Running the actual recovered migrations in disposable PGlite reproduced:

1. An OPERATOR can insert evidence in its own organisation referencing a signal in another organisation. RLS on the child row does not constrain the referenced parent's organisation.
2. An OPERATOR can set an action to EXECUTED and invent execution_result without an approval.
3. The application's agent_runs insert fails with SQLSTATE 42501: authenticated has SELECT but no INSERT grant/policy. Current multiwrite preparation reaches that failure only after prior objects have been written.
4. An OPERATOR can supply another identity as created_by.
5. An OPERATOR can insert a REALIZED economic outcome without verification.

These are results of the recovered schema under emulated authenticated database roles, not live exploitation or real-data tests.

## Proposed repair — NOT APPLIED

`proposed-preparation-repair.sql` adds composite organisation/ID uniqueness and foreign keys, removes all operational mutation policies/grants, and reintroduces only narrow synthetic preparatory inserts. It requires created_by=auth.uid, active ADMIN/OPERATOR membership in the row's organisation, synthetic provenance, pending/proposed states and NULL confidence for deterministic analysis. Direct approvals, outcomes, action updates, deletes and entity modifications remain denied. No SECURITY DEFINER functions are created.

This deliberately narrows previously allowed behaviour. It is a consequential access-control change and requires review before deployment. Constraints validate existing rows and abort the transaction if cross-organisation references already exist. Inspect existing data first; do not silently relabel/delete records to force validation. Audit any existing privileged service consumers separately: a service role bypasses RLS.

The SQL is a bounded safety candidate, not a complete execution design. Preparation remains non-atomic. Synthetic preparation and execution HTTP routes must remain disabled until transactional commands, actual authentication, access testing and an accountable task/outcome path are established. No lesson or task tables were invented to claim completion.

## Validation

`local-validation-result.json` records five baseline defect reproductions and twelve passing repair checks. `validate-recovered.cjs` is the reproducible harness. It runs baseline and repaired schemas in separate disposable PGlite instances and verifies cross-tenant rejection, action mutation denial, actor integrity, valid synthetic writes, null confidence, confidence spoof denial, approval/outcome denial, tenant read isolation, viewer denial, inactive denial and anonymous denial.

PGlite is installed outside the repository; no runtime dependency was added. Example command:

```sh
RALPH_PGLITE_MODULE=/absolute/path/to/disposable/node_modules/@electric-sql/pglite node docs/database-review/validate-recovered.cjs
```

Limits: auth.users is a simplified fixture table; auth.uid() reads a session setting to emulate the subject. Only the pgcrypto CREATE EXTENSION statement is omitted in execution because native gen_random_uuid is available. Archival SQL files are unchanged. This tests PostgreSQL constraints, grants and RLS under role switching; it does not test JWT validation, PostgREST, live Supabase Auth, the actual owner's session, production access or production performance.

Official source reviewed: https://supabase.com/docs/guides/database/postgres/row-level-security. The live schema is the authority for implementation; old architecture prose is not a migration specification.

## Independent review limitations

An independent reviewer reran all five baseline reproductions and twelve repair checks successfully. Organisation-matching foreign keys do not ensure references belong to the same investigation; JSON evidence/input references remain unchecked. Caller-supplied synthetic flags are labels, not source attestation. The proposed agent_runs policy checks deterministic metadata but does not require synthetic parent provenance or a parent reference. These limitations prevent any claim of complete evidence integrity or synthetic isolation. The proposal must not reenable either paused HTTP route.
