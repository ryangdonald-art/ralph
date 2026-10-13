# Controlled operating memory — local retrieval candidate

This module preserves all 94 interpreted records in the recovered 12 October rules register. It does not claim the archive is the complete historical record, that summaries are original instructions, or that every listed rule has been implemented. Original dates remain null where they are not independently established. Evidence/status strings preserve partial dates without inventing a year.

## Retrieve before work

Run `node scripts/operating-memory.js` with a JSON request on standard input:

```json
{
  "scope": "linkedin",
  "asOf": "2026-10-13",
  "context": { "ownerScope": "approved-owner-label", "organizationScope": "approved-org-label" },
  "presentationOverrides": { "paragraphs": 5 },
  "sourceDocuments": []
}
```

Exact scopes: `general`, `linkedin`, `capital`, `software`, `design`, `drm-partner`, `drm-owned`, `drm-micro`. The caller must select a scope deliberately. This is not semantic search: an Old School business story belongs to `linkedin`; an Old School acquisition assessment belongs to `capital`. Unknown scopes fail closed. Multi-domain tasks retrieve each explicit scope separately and retain its boundary.

Owner and organisation labels are required for provenance but are NOT authenticated by this local function. Use only after an external access boundary validates the actual actor and permitted sources. No private business facts or cross-organisation store are loaded. Do not expose this CLI as an authenticated HTTP API without implementing and testing that boundary.

## Authority and conflicts

`CURRENT-*` rules are new, labelled interpretations of the current owner directive, subject to system/security constraints. They are not recovered original prompts. `B-01`–`B-03` apply globally from the verified Beast Mode source. `L-01`–`L-22` and `R-01`–`R-05`/`R-09` apply to LinkedIn from the verified locked writing source. The coordinator reread both originals on 13 October; source names and version are recorded in the manifest. Remaining historical proposals, recommendations, findings and contracts stay context only, not active instructions. Promotion requires reviewed code/manifest change with source evidence, not matching the word “standing”.

Explicit LinkedIn presentation overrides may set positive integer `targetCharacters`, `maxCharacters`, `paragraphs`, or boolean `personalVoice`. They cannot override approvals, fact integrity, security or evidence. The output removes superseded first-person/default-length rules and explains the exclusions while preserving their archive records. Count final text separately with the editorial gate; retrieval does not check a draft itself.

Sources supplied through `sourceDocuments` are hashed and classified as data. Their text and asserted authority never enter active policy. This prevents direct source-to-rule promotion, not all possible prompt injection in downstream language-model use. Callers must keep the instruction/data boundary intact.

DRM models return separate, explicitly missing assumption packs. No historical financial number is treated as current, and no partner share is copied into owned-network economics. Retrieve approved dated business assets separately through their protected storage before analysis.

## Proof and limits

`node --test test/operatingMemory.test.js` verifies 94-record preservation, scope selection, presentation conflict handling, unknown-scope rejection, source injection non-promotion, missing DRM assumptions, and a later fresh-process retrieval. `manifest.json` pins archive integrity; authorised updates must update that pin and run tests. The pin detects accidental drift, not a malicious actor able to change both files.

This is local versioned repository retrieval, not model training, universal ChatGPT memory, production deployment or proof that every subsequent answer obeys every rule. The caller still has to invoke it and apply its findings. Missing PETALS/TOP 40/Supreme/Constitution and standalone reviewer originals remain visible. No automatic recovery of missing originals is claimed.

Rollback: revert the reviewed memory files and associated entrypoint instruction together; keep original audit assets unchanged. No database migration or remote operation is involved.
