const { canExecute, PERMISSION_LEVELS } = require('../domain/contracts');

class ExecutionGuard {
  constructor() { this.executed = new Map(); }
  execute(action, executor) {
    if (!action?.id || !action?.idempotencyKey) throw new Error('action id and idempotencyKey are required');
    if (this.executed.has(action.idempotencyKey)) return { ...this.executed.get(action.idempotencyKey), duplicatePrevented:true };
    const approved = action.approvalStatus === 'APPROVED' && Boolean(action.approver) && Boolean(action.approvalTimestamp);
    if (!canExecute({ permissionLevel:action.permissionLevel, approved, actionType:action.actionType })) throw new Error('action is not permitted or lacks required approval');
    if (action.permissionLevel === PERMISSION_LEVELS.EXECUTE_WITH_APPROVAL && !approved) throw new Error('Level 3 action requires approval');
    const result = executor(action);
    const record = { actionId:action.id, idempotencyKey:action.idempotencyKey, executionStatus:'EXECUTED', result, executedAt:new Date().toISOString(), duplicatePrevented:false };
    this.executed.set(action.idempotencyKey, record);
    return record;
  }
}
module.exports = { ExecutionGuard };