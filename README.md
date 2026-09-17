# RALPH 2.0

**Ryan's Autonomous Logic & Profit Heuristic**

RALPH 2.0 is being developed as an executive operating instrument: detect what needs attention, investigate the evidence, challenge the conclusion, put a management call in front of the authorized human, execute only within the permitted boundary, and retain the outcome.

## Current development boundary

- Working branch: `ralph-2-foundation`
- PR #1 is a development checkpoint and must not be merged without explicit Ryan authorization.
- V1 autonomy is capped at Level 3 with human approval.
- Level 4 is prohibited.
- No confidential Dealworx/DRM operating data is to be onboarded until the Authorization Gate has passed in real runtime.
- Production persistence is intended to move to Supabase; existing JSON is legacy/migration/synthetic-seed only once that migration is verified.

## V1 product direction

Phone first. The primary question is:

**WHAT NEEDS MY ATTENTION?**

The first three screens are Login, Attention Queue and Decision. The decision evidence chain is:

`SIGNAL → EVIDENCE → SHERLOCK → RAT → RALPH → HUMAN DECISION`

Human decision controls are limited to **APPROVE**, **INVESTIGATE FURTHER**, and **REJECT**.

## Proprietary status

Copyright © 2026 Ryan Graham Donald. All rights reserved.

RALPH is proprietary. Access to this repository does not itself grant a licence or ownership interest. See `PROPRIETARY.md`.

The intended underlying RALPH IP owner is Ryan Graham Donald. This statement and repository notice do not themselves perfect legal title or replace any written assignment required by law. The evidence status and remediation work are tracked in `docs/RALPH_OWNERSHIP_CHAIN_OF_TITLE.md`.

Third-party and open-source software remains subject to its own applicable licence terms and notices.

## Development

```bash
npm ci
npm test
npm run check
npm start
```

The repository currently contains the controlled RALPH 2.0 foundation, including authentication/authorization foundations, deterministic cash-flow detection, domain contracts, execution guardrails, tests and the legacy JSON repository abstraction.
