'use strict';

// Offline deterministic simulation only. Actor names are fixtures, not identities.
// No network requests, real business execution, or production authentication.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { analyseScenario } = require('./cashFlowLoop');

const MODE = 'LOCAL_SYNTHETIC_SIMULATION';
const copy = value => JSON.parse(JSON.stringify(value));
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}
const LESSON_SUFFIX = ' Attach a timestamped bank balance and committed-payment schedule to the verification task.';
function initial() { return {schemaVersion:1, mode:MODE, revision:0, cases:[], lessons:[], events:[]}; }

function validateState(state) {
  const valid = condition => { if (!condition) throw new Error('Invalid workflow state; restore a verified backup'); };
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const timestamp = value => text(value) && Number.isFinite(Date.parse(value));
  valid(object(state) && state.schemaVersion === 1 && state.mode === MODE &&
    Number.isSafeInteger(state.revision) && state.revision >= 0 &&
    Array.isArray(state.cases) && Array.isArray(state.lessons) && Array.isArray(state.events));
  const unique = rows => {
    const ids = new Set();
    for (const row of rows) { valid(object(row) && text(row.id) && !ids.has(row.id)); ids.add(row.id); }
  };
  unique(state.cases); unique(state.lessons); unique(state.events);
  const taskIds = new Set(), lessonCases = new Set();
  for (const lesson of state.lessons) {
    const origin = state.cases.find(item => item.id === lesson.caseId);
    valid(origin && object(origin.outcome) && lesson.evidenceRef === origin.outcome.evidenceRef &&
      !lessonCases.has(lesson.caseId) && lesson.version === 1 &&
      lesson.kind === 'REQUIRE_TIMESTAMPED_VERIFICATION_EVIDENCE' &&
      lesson.scope === 'cash-flow verification task wording only' &&
      text(lesson.proposer) && text(lesson.reason) &&
      ['PROPOSED','APPROVED','REJECTED'].includes(lesson.status));
    lessonCases.add(lesson.caseId);
    if (lesson.status === 'PROPOSED') valid(lesson.review === undefined);
    else valid(object(lesson.review) && text(lesson.review.actor) && lesson.review.actor !== lesson.proposer &&
      text(lesson.review.reason) && lesson.review.simulatedHumanReview === true);
  }
  for (const record of state.cases) {
    valid(record.mode === MODE && text(record.sourceRef) && object(record.input) &&
      record.inputHash === digest({input:record.input, sourceRef:record.sourceRef}) &&
      ['NO_SIGNAL','AWAITING_APPROVAL','APPROVED','TASK_OPEN','OUTCOME_RECORDED'].includes(record.status));
    let expected;
    try { expected = analyseScenario(record.input); } catch { valid(false); }
    if (record.appliedLesson !== null) {
      valid(object(record.appliedLesson));
      const lesson = state.lessons.find(item => item.id === record.appliedLesson.id);
      valid(lesson && lesson.status === 'APPROVED' && lesson.version === record.appliedLesson.version &&
        lesson.caseId !== record.id && expected.ralph !== null);
      expected.ralph.summary += LESSON_SUFFIX;
    }
    valid(JSON.stringify(record.analysis) === JSON.stringify(expected));
    valid(Boolean(expected.detected.signal) === (record.status !== 'NO_SIGNAL'));
    const hasApproval = ['APPROVED','TASK_OPEN','OUTCOME_RECORDED'].includes(record.status);
    const hasTask = ['TASK_OPEN','OUTCOME_RECORDED'].includes(record.status);
    const hasOutcome = record.status === 'OUTCOME_RECORDED';
    valid(hasApproval ? object(record.approval) : record.approval === undefined);
    valid(hasTask ? object(record.task) : record.task === undefined);
    valid(hasOutcome ? object(record.outcome) : record.outcome === undefined);
    if (hasApproval) valid(text(record.approval.actor) && text(record.approval.note) &&
      record.approval.simulatedHumanApproval === true && timestamp(record.approval.at));
    if (hasTask) {
      valid(text(record.task.id) && !taskIds.has(record.task.id) &&
        record.task.type === 'LOCAL_VERIFICATION_TASK' && record.task.externalEffect === false &&
        record.task.summary === expected.ralph.summary &&
        record.task.status === (hasOutcome ? 'COMPLETED' : 'OPEN'));
      taskIds.add(record.task.id);
    }
    if (hasOutcome) valid(text(record.outcome.actor) && text(record.outcome.evidenceRef) &&
      Number.isFinite(record.outcome.observedGap) && record.outcome.observedGap >= 0 &&
      record.outcome.economicState === 'SIMULATED_OBSERVATION' && record.outcome.realWorldVerified === false);
  }
  const allowedEvents = ['EVIDENCE_AND_DETERMINISTIC_REVIEW_RECORDED','SIMULATED_HUMAN_APPROVAL','LOCAL_TASK_CREATED',
    'SIMULATED_TASK_COMPLETED_AND_OUTCOME_RECORDED','LESSON_PROPOSED','LESSON_REVIEWED'];
  const eventKeys = new Set();
  for (const event of state.events) {
    const record = state.cases.find(item => item.id === event.caseId);
    const key = JSON.stringify([event.caseId, event.type]);
    valid(record && allowedEvents.includes(event.type) && !eventKeys.has(key) &&
      event.mode === MODE && text(event.actor) && timestamp(event.at));
    eventKeys.add(key);
    if (event.type === allowedEvents[0]) valid(event.inputHash === record.inputHash && event.sourceRef === record.sourceRef &&
      JSON.stringify(event.appliedLesson) === JSON.stringify(record.appliedLesson));
    if (event.type === allowedEvents[1]) valid(record.approval && event.actor === record.approval.actor);
    if (event.type === allowedEvents[2]) valid(record.task && event.taskId === record.task.id);
    if (event.type === allowedEvents[3]) valid(record.outcome && event.actor === record.outcome.actor &&
      event.evidenceRef === record.outcome.evidenceRef && event.observedGap === record.outcome.observedGap);
    if (event.type === allowedEvents[4] || event.type === allowedEvents[5]) {
      const lesson = state.lessons.find(item => item.id === event.lessonId);
      valid(lesson && lesson.caseId === record.id);
      valid(event.type === allowedEvents[4] ? event.actor === lesson.proposer :
        lesson.review && event.actor === lesson.review.actor && event.status === lesson.status);
    }
  }
  for (const record of state.cases) {
    const types = [allowedEvents[0]];
    if (record.approval) types.push(allowedEvents[1]);
    if (record.task) types.push(allowedEvents[2]);
    if (record.outcome) types.push(allowedEvents[3]);
    const lesson = state.lessons.find(item => item.caseId === record.id);
    if (lesson) { types.push(allowedEvents[4]); if (lesson.review) types.push(allowedEvents[5]); }
    let previousIndex = -1;
    for (const type of types) {
      const index = state.events.findIndex(event => event.caseId === record.id && event.type === type);
      valid(index > previousIndex); previousIndex = index;
    }
    if (record.appliedLesson) {
      const lessonReviewIndex = state.events.findIndex(event => event.type === allowedEvents[5] && event.lessonId === record.appliedLesson.id);
      const detectionIndex = state.events.findIndex(event => event.type === allowedEvents[0] && event.caseId === record.id);
      valid(lessonReviewIndex >= 0 && lessonReviewIndex < detectionIndex);
    }
  }
}

class ControlledWorkflow {
  constructor({filePath, beforeCommit}={}) {
    if (!filePath) throw new Error('filePath is required');
    this.filePath = path.resolve(filePath);
    this.beforeCommit = beforeCommit; // failure injection for regression tests only
  }

  async snapshot() {
    let state;
    try { state = JSON.parse(await fs.readFile(this.filePath, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return initial(); throw error; }
    validateState(state);
    return state;
  }

  async transaction(operation) {
    await fs.mkdir(path.dirname(this.filePath), {recursive:true});
    const lockPath = `${this.filePath}.lock`;
    let lock;
    try { lock = await fs.open(lockPath, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') throw new Error('WORKFLOW_BUSY: retry after the current writer completes; inspect orphaned locks manually'); throw error; }
    const temporary = `${this.filePath}.${crypto.randomUUID()}.tmp`;
    try {
      const state = await this.snapshot();
      const result = operation(state);
      state.revision += 1;
      validateState(state);
      if (this.beforeCommit) await this.beforeCommit(copy(state));
      const handle = await fs.open(temporary, 'wx', 0o600);
      try { await handle.writeFile(JSON.stringify(state, null, 2)); await handle.sync(); }
      finally { await handle.close(); }
      await fs.rename(temporary, this.filePath);
      return copy(result);
    } finally {
      await fs.rm(temporary, {force:true});
      await lock.close();
      await fs.unlink(lockPath);
    }
  }

  event(state, type, caseId, actor, detail={}) {
    state.events.push({id:crypto.randomUUID(), type, caseId, actor, mode:MODE, at:new Date().toISOString(), ...detail});
  }

  async detect({caseId, input, sourceRef}) {
    required(caseId, 'caseId'); required(sourceRef, 'sourceRef');
    // Copy before awaiting I/O; callers cannot change inputs while a write waits.
    input = copy(input);
    const inputHash = digest({input, sourceRef});
    return this.transaction(state => {
      const existing = state.cases.find(item => item.id === caseId);
      if (existing) {
        if (existing.inputHash !== inputHash) throw new Error('Idempotency conflict: caseId was used with different evidence');
        return existing;
      }
      const analysis = analyseScenario(input);
      const lesson = state.lessons.filter(item => item.status === 'APPROVED').at(-1);
      const record = {id:caseId, inputHash, sourceRef, input, mode:MODE, analysis,
        status:analysis.detected.signal ? 'AWAITING_APPROVAL' : 'NO_SIGNAL',
        appliedLesson:analysis.detected.signal && lesson ? {id:lesson.id, version:lesson.version} : null};
      if (record.appliedLesson) {
        // Allowlisted advisory change only: no threshold, authority or access changes.
        record.analysis.ralph.summary += LESSON_SUFFIX;
      }
      state.cases.push(record);
      this.event(state, 'EVIDENCE_AND_DETERMINISTIC_REVIEW_RECORDED', caseId, 'fixture-detector', {inputHash, sourceRef, appliedLesson:record.appliedLesson});
      return record;
    });
  }

  find(state, caseId) {
    const record = state.cases.find(item => item.id === caseId);
    if (!record) throw new Error('Case not found');
    return record;
  }

  async approve({caseId, actor, note}) {
    required(actor, 'fixture approver'); required(note, 'approval note');
    return this.transaction(state => {
      const record = this.find(state, caseId);
      if (record.approval) {
        if (record.approval.actor !== actor || record.approval.note !== note) throw new Error('Approval conflict: approval already recorded');
        return record;
      }
      if (record.status !== 'AWAITING_APPROVAL') throw new Error('Case is not awaiting approval');
      record.approval = {actor, note, simulatedHumanApproval:true, at:new Date().toISOString()};
      record.status = 'APPROVED';
      this.event(state, 'SIMULATED_HUMAN_APPROVAL', caseId, actor);
      return record;
    });
  }

  async execute({caseId}) {
    return this.transaction(state => {
      const record = this.find(state, caseId);
      if (record.task) return record;
      if (record.status !== 'APPROVED' || !record.approval) throw new Error('Explicit fixture approval required');
      record.task = {id:crypto.randomUUID(), type:'LOCAL_VERIFICATION_TASK', status:'OPEN', summary:record.analysis.ralph.summary, externalEffect:false};
      record.status = 'TASK_OPEN';
      this.event(state, 'LOCAL_TASK_CREATED', caseId, 'fixture-executor', {taskId:record.task.id});
      return record;
    });
  }

  async complete({caseId, actor, evidenceRef, observedGap}) {
    required(actor, 'fixture operator'); required(evidenceRef, 'completion evidence reference');
    if (!Number.isFinite(observedGap) || observedGap < 0) throw new Error('observedGap must be non-negative');
    return this.transaction(state => {
      const record = this.find(state, caseId);
      if (record.outcome) {
        if (record.outcome.actor !== actor || record.outcome.evidenceRef !== evidenceRef || record.outcome.observedGap !== observedGap) throw new Error('Completion conflict: outcome already recorded');
        return record;
      }
      if (record.status !== 'TASK_OPEN') throw new Error('An open task is required before completion');
      record.task.status = 'COMPLETED';
      record.outcome = {actor, evidenceRef, observedGap, economicState:'SIMULATED_OBSERVATION', realWorldVerified:false};
      record.status = 'OUTCOME_RECORDED';
      this.event(state, 'SIMULATED_TASK_COMPLETED_AND_OUTCOME_RECORDED', caseId, actor, {evidenceRef, observedGap});
      return record;
    });
  }

  async proposeLesson({caseId, actor, reason}) {
    required(actor, 'fixture proposer'); required(reason, 'lesson reason');
    return this.transaction(state => {
      const record = this.find(state, caseId);
      if (!record.outcome) throw new Error('Recorded outcome required');
      const existing = state.lessons.find(item => item.caseId === caseId);
      if (existing) {
        if (existing.proposer !== actor || existing.reason !== reason) throw new Error('Lesson proposal conflict');
        return existing;
      }
      const lesson = {id:crypto.randomUUID(), version:1, caseId, proposer:actor, reason,
        kind:'REQUIRE_TIMESTAMPED_VERIFICATION_EVIDENCE', status:'PROPOSED',
        evidenceRef:record.outcome.evidenceRef, scope:'cash-flow verification task wording only'};
      state.lessons.push(lesson);
      this.event(state, 'LESSON_PROPOSED', caseId, actor, {lessonId:lesson.id});
      return lesson;
    });
  }

  async reviewLesson({lessonId, actor, approved, reason}) {
    required(actor, 'fixture reviewer'); required(reason, 'review reason');
    if (typeof approved !== 'boolean') throw new Error('Explicit boolean lesson decision required');
    return this.transaction(state => {
      const lesson = state.lessons.find(item => item.id === lessonId);
      if (!lesson) throw new Error('Lesson not found');
      if (lesson.proposer === actor) throw new Error('A different fixture reviewer must review the lesson');
      const next = approved ? 'APPROVED' : 'REJECTED';
      if (lesson.status !== 'PROPOSED') {
        if (lesson.status !== next || lesson.review.actor !== actor || lesson.review.reason !== reason) throw new Error('Reviewed lessons are immutable');
        return lesson;
      }
      lesson.status = next;
      lesson.review = {actor, reason, simulatedHumanReview:true};
      this.event(state, 'LESSON_REVIEWED', lesson.caseId, actor, {lessonId, status:next});
      return lesson;
    });
  }
}

module.exports = { ControlledWorkflow, MODE };
