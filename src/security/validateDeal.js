const { AppError } = require('../domain/errors');
const MAX_TEXT = 5000;

function text(value, field, maxLength, { required = false, fallback = '' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError('VALIDATION_ERROR', `${field} is required`);
    return fallback;
  }
  if (typeof value !== 'string') throw new AppError('VALIDATION_ERROR', `${field} must be text`);
  const clean = value.trim();
  if (required && !clean) throw new AppError('VALIDATION_ERROR', `${field} is required`);
  if (clean.length > maxLength) throw new AppError('VALIDATION_ERROR', `${field} is too long`);
  return clean || fallback;
}

function money(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value !== 'number' && typeof value !== 'string') throw new AppError('VALIDATION_ERROR', 'value must be a non-negative number');
  if (typeof value === 'string' && !/^\d+(\.\d+)?$/.test(value.trim())) throw new AppError('VALIDATION_ERROR', 'value must be a non-negative number');
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > Number.MAX_SAFE_INTEGER) throw new AppError('VALIDATION_ERROR', 'value must be a non-negative number');
  return parsed;
}

function validateDeal(input = {}) {
  return {
    company: text(input.company, 'company', 200, { required: true }),
    title: text(input.title, 'title', 200, { required: true }),
    stage: text(input.stage, 'stage', 100, { fallback: 'New' }),
    value: money(input.value),
    nextAction: text(input.nextAction, 'nextAction', 500, { fallback: 'Review' }),
    notes: text(input.notes, 'notes', MAX_TEXT)
  };
}

module.exports = { validateDeal };