class AgentService {
  constructor({ agent, provider, model, runner }) {
    this.agent = agent; this.provider = provider; this.model = model; this.runner = runner;
  }
  async run({ input, contextReferences=[], toolsRequested=[] }) {
    const started = Date.now();
    try {
      if (typeof this.runner !== 'function') throw new Error('No live model runner configured');
      const output = await this.runner({ agent:this.agent, provider:this.provider, model:this.model, input, contextReferences, toolsRequested });
      return { agent:this.agent, provider:this.provider, model:this.model, input, contextReferences, toolsRequested, output, confidence:output?.confidence ?? null, durationMs:Date.now()-started, cost:null, error:null, timestamp:new Date().toISOString() };
    } catch (error) {
      return { agent:this.agent, provider:this.provider, model:this.model, input, contextReferences, toolsRequested, output:null, confidence:null, durationMs:Date.now()-started, cost:null, error:error.message, timestamp:new Date().toISOString() };
    }
  }
}

function validateSherlockFinding(finding) {
  const required = ['anomaly','baseline','materiality','supportingEvidence','contradictoryEvidence','hypotheses','missingInformation','economicExposure','confidence'];
  if (finding?.status === 'INSUFFICIENT EVIDENCE') return finding;
  for (const field of required) if (!(field in (finding || {}))) throw new Error(`Sherlock finding missing ${field}`);
  return finding;
}

function validateRatChallenge(challenge) {
  const required = ['challenges','contradictoryEvidence','missingEvidence','alternativeHypotheses','risk','revisedConfidence','falsificationEvidence'];
  for (const field of required) if (!(field in (challenge || {}))) throw new Error(`RAT challenge missing ${field}`);
  return challenge;
}

module.exports = { AgentService, validateSherlockFinding, validateRatChallenge };