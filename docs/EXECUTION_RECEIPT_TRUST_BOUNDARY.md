# RALPH Council execution receipt — trust boundary

The internal HMAC receipt in `src/intelligence/execution-receipt.js` provides **integrity after the trusted application signs a record**. It does not, by itself, prove that an external model provider executed anything. A malicious or compromised signer could sign fabricated metadata.

## Minimum integration requirements
1. Verify the provider response through an authenticated provider adapter, not from model-generated text.
2. Bind the receipt to the actual provider run identifier, model/configuration version, tenant, task, timestamps and evidence manifest. The current prototype binds only six fields and is not a full production receipt.
3. Keep signing keys in a managed secret store; never in source, browser code, prompts or model outputs.
4. Persist immutable event records in a tenant-scoped database transaction with replay/idempotency checks.
5. Enforce run expiry, unique IDs, key rotation, revocation and audit access.
6. Never equate an HMAC-validated receipt with factually correct specialist findings.
7. Require actual independent provider verification and evaluated evidence before marking an execution as independent.
8. Human approval remains separate from a Council review.

## Verification
The nine receipt unit tests were executed locally on Node 22 on 2026-11-07 and passed. This verifies the isolated receipt module only, not the full RALPH test suite or deployed integration.

## Release
NOT PRODUCTION READY. The complete Council branch still requires CI, provider integration, durable storage, identity and RLS verification.
