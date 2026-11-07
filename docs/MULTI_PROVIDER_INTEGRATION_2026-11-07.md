# RALPH multi-provider integration assessment — 2026-11-07

**Status:** researched and provider-neutral candidate router coded on isolated review branch; NO paid provider calls, credentials, live GPT connections or production deployment.

## Official provider tools
| Provider | Official documentation | Relevant options | Candidate roles |
|---|---|---|---|
| OpenAI | https://developers.openai.com/api/docs/guides/agents ; https://developers.openai.com/api/docs/guides/tools | Agents SDK/API, Responses API, function calling, hosted web/file search, MCP, tracing | RALPH, RENEE, commercial |
| Anthropic Claude | https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview ; https://platform.claude.com/docs/en/agents-and-tools/mcp-connector | Messages API, Managed Agents, web search/fetch, code execution, client tools, remote MCP | SHERLOCK, RAT, independent review |
| Meta | https://dev.meta.ai/docs/tool-calling | Meta Model API tool calling and application-defined tools; Llama ecosystem may allow self-hosting subject to licensing and deployment | Experimental independent reviewer |
| xAI Grok | https://docs.x.ai/developers/tools/overview ; https://docs.x.ai/developers/tools/function-calling | API function calling, web/X search, code interpreter | External perspective and X-source discovery |

## Architecture
- RALPH owns task state, tenant authorization, evidence references, policy gates and final human approval.
- Each specialist uses a versioned prompt/configuration in the RALPH codebase, not an assumed callable ChatGPT Custom GPT ID.
- A provider adapter is allowed only after the owner authorises its data flows and any usage costs. Provider keys stay in secret management.
- One agent cannot mark itself independently executed; trusted server-side adapter must bind tenant, run ID, provider response ID, model/configuration and receipts.
- Different providers receive only approved minimal data, with redaction for sensitive commercial, legal and personal information.
- Provider disagreement is logged as evidence for human judgment; it is not resolved by majority vote.
- Tool invocation must be allowlisted by task, with no production financial, publishing, destructive or permission-changing actions without explicit human approval.

## Build stages
1. **Completed:** provider-neutral routing candidate and regression tests authored.
2. **Pending:** execute complete CI; test safe mock adapters for each provider.
3. **Pending:** obtain approved provider API credentials and budgets; verify outbound network and secure key storage.
4. **Pending:** staging-only real provider execution with non-sensitive synthetic prompts, authenticated receipts and measured costs.
5. **Pending:** tenant-scoped durable event persistence and RLS tests.
6. **Pending:** human release decision; no automatic deployment.

## Important distinctions
- ChatGPT Custom GPTs are product configurations; they are not automatically callable as independent OpenAI API agents.
- Anthropic's remote MCP connector is beta and not zero-data-retention eligible; review data handling before any sensitive material is sent.
- Meta and xAI are candidates, not currently connected.
- This research is a feature assessment, not a measured provider benchmark or security audit.
