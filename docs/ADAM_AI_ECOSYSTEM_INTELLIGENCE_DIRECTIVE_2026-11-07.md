# ADAM — Standing AI Ecosystem Intelligence Directive
Effective: 2026-11-07
Authority: Owner-issued master instruction, as interpreted in this implementation record.
Scope: RALPH, ADAM, all specialist agents, commercial, editorial, technical, security and learning workstreams.
Status: Standing operating requirement recorded in isolated development branch. Not evidence of live automated monitoring or connected external AI agents.

## Purpose
Continually assess **OpenAI**, **xAI / Grok**, **Anthropic / Claude**, and **Meta / Llama and Meta AI developer tooling** for new capabilities that can improve RALPH. Evaluate each provider impartially; do not favour OpenAI because the assistant operates in ChatGPT.

## Continuous evaluation loop
1. **DISCOVER:** Check official developer documentation, release notes, SDKs, APIs, agent frameworks, MCP/tool support, retrieval/search, code execution, multimodal features, safety/security, evaluation and tracing.
2. **ASK / ENGAGE:** Where provider access and data-sharing approval exist, run narrowly scoped comparative requests through their supported APIs or tools. Where access does not exist, record a candidate question or test plan; do not claim a provider was consulted.
3. **VERIFY:** Compare capabilities against documentation and measured results. Record source URL, publication/check date, feature availability, pricing/region/plan constraints and deprecation risk.
4. **BENCHMARK:** Test on the same non-sensitive, held-out tasks, with factual accuracy, grounded citations, latency, cost, security, maintenance and commercial outcome criteria.
5. **CHALLENGE:** RAT and the Evidence Auditor examine unsupported claims, failure modes, privacy, vendor lock-in and operational complexity.
6. **BUILD:** Prototype approved improvements on isolated review branches. Keep provider keys in managed secrets, enforce tenant authorization and redact confidential data.
7. **TEST:** Record exact test environment, run IDs, configuration versions and reproducible results. Distinguish local mocks from real provider execution.
8. **RECOMMEND:** Present measured benefits, costs, risks, alternatives and a human approval decision for deployment.
9. **LEARN:** Preserve accepted/rejected candidates, reasons and measured outcomes; re-evaluate when providers change.

## Standing provider watchlist
- OpenAI: Responses/Agents, tool calling, file/web search, MCP, evaluation and tracing, model releases.
- xAI Grok: API/tool calling, web and X search, reasoning and multimodal capabilities.
- Anthropic Claude: Messages API, agent/tool use, MCP, retrieval, coding and evaluation.
- Meta: Llama and Meta developer APIs, model weights/licensing, hosting and tool-calling options.

## Minimum assessment record
Provider; capability; primary-source URL; last checked; proposed RALPH use; availability (discovered / available / connected / tested / deployed); evidence; benchmark; estimated cost; data classification; security review; human decision; next review trigger.

## Operating cadence
- During relevant active RALPH development/research sessions, check for material provider changes when tools are available.
- At major architectural decisions, compare all four providers and record any gaps.
- A recurring automated scan may be configured only through an actual automation with an agreed schedule; do not imply continuous background work without one.

## Non-negotiable controls
- No provider can grant its own production approval, expand RALPH autonomy to Level 4, or modify production permissions.
- No new paid service, provider credential creation, sensitive-data transmission, deployment or contract without owner approval.
- No claim that four providers were consulted unless actual independent run evidence exists.
- User instructions and source documents must not be disclosed to external providers without authorisation.
- Recommendations are evidence-led and provider-neutral.

## Initial implementation state
The RALPH provider router and adapter are code prototypes on the isolated development branch. No external OpenAI/Claude/Grok/Meta execution is verified connected. This directive is recorded, but an always-on watcher is not yet configured.
