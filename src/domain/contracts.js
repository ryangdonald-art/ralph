const RALPH_OUTPUT_TYPES = Object.freeze(['ACTION','DECISION','ALERT','TASK','FOLLOW-UP','ESCALATION','KILL']);
const ECONOMIC_IMPACT_STATES = Object.freeze(['ESTIMATED','VERIFIED','REALIZED']);
const PERMISSION_LEVELS = Object.freeze({ OBSERVE:0, RECOMMEND:1, PREPARE:2, EXECUTE_WITH_APPROVAL:3, AUTONOMOUS:4 });
const V1_MAX_PERMISSION = PERMISSION_LEVELS.EXECUTE_WITH_APPROVAL;
const PROHIBITED_AUTONOMOUS_ACTIONS = Object.freeze(['FINANCIAL_TRANSACTION','CONTRACTUAL_COMMITMENT','DESTRUCTIVE_RECORD_CHANGE','HIGH_RISK_EXTERNAL_COMMUNICATION']);

function assertEnum(value, allowed, field) {
  if (!allowed.includes(value)) throw new Error(`${field} must be one of: ${allowed.join(', ')}`);
  return value;
}

function economicImpact({ amount, currency='ZAR', state='ESTIMATED' }) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('economic impact amount must be a non-negative number');
  assertEnum(state, ECONOMIC_IMPACT_STATES, 'economic impact state');
  return Object.freeze({ amount, currency, state });
}

function canExecute({ permissionLevel, approved=false, actionType }) {
  if (permissionLevel > V1_MAX_PERMISSION) return false;
  if (PROHIBITED_AUTONOMOUS_ACTIONS.includes(actionType) && !approved) return false;
  return permissionLevel < PERMISSION_LEVELS.EXECUTE_WITH_APPROVAL || approved;
}

function validateRalphOutput(output) {
  if (!output || typeof output !== 'object') throw new Error('RALPH output must be an object');
  assertEnum(output.type, RALPH_OUTPUT_TYPES, 'RALPH output type');
  if (!output.summary || typeof output.summary !== 'string') throw new Error('RALPH output requires summary');
  return output;
}

function validateAgentRun(run) {
  const roles = ['RALPH','SHERLOCK','RAT','EXECUTION'];
  assertEnum(run.agent, roles, 'agent');
  if (!run.provider || !run.model) throw new Error('agent run requires provider and model');
  return run;
}

module.exports = { RALPH_OUTPUT_TYPES, ECONOMIC_IMPACT_STATES, PERMISSION_LEVELS, V1_MAX_PERMISSION, PROHIBITED_AUTONOMOUS_ACTIONS, economicImpact, canExecute, validateRalphOutput, validateAgentRun };