'use strict';
/** Provider-neutral request planning only. No API calls or secrets. */
const PROVIDERS=Object.freeze({
  openai:Object.freeze({interface:'responses-or-agents',supports:['tools','mcp','file-search'],docs:'https://developers.openai.com/api/docs/guides/agents'}),
  anthropic:Object.freeze({interface:'messages-or-managed-agents',supports:['tools','mcp','web-fetch'],docs:'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview'}),
  meta:Object.freeze({interface:'meta-model-api-or-self-hosted',supports:['tool-calling'],docs:'https://dev.meta.ai/docs/tool-calling'}),
  xai:Object.freeze({interface:'xai-api',supports:['function-calling','web-search','x-search'],docs:'https://docs.x.ai/developers/tools/overview'})
});
const ROLE_PREFERENCES=Object.freeze({
  RALPH:['openai','anthropic'],SHERLOCK:['anthropic','openai','xai'],RAT:['anthropic','openai','meta'],
  RENEE:['openai','anthropic'],BOB:['openai','anthropic'],PETALS:['openai','anthropic'],
  NONO:['openai','anthropic'],EVIDENCE_AUDITOR:['openai','anthropic']
});
function planProvider({role,available=[],approved=[]}={}){
  if(!ROLE_PREFERENCES[role])throw new Error('Unmapped specialist');
  if(!Array.isArray(available)||!Array.isArray(approved))throw new Error('Provider lists required');
  const candidates=ROLE_PREFERENCES[role].filter(p=>available.includes(p)&&approved.includes(p));
  if(!candidates.length)return Object.freeze({role,status:'blocked',reason:'NO_AVAILABLE_APPROVED_PROVIDER',provider:null});
  return Object.freeze({role,status:'candidate',provider:candidates[0],reason:'REQUIRES_CREDENTIAL_AND_RUNTIME_VERIFICATION'});
}
module.exports={PROVIDERS,ROLE_PREFERENCES,planProvider};
