const SECRET_KEYS = /authorization|cookie|password|secret|token|api[-_]?key/i;

function sanitize(value, depth = 0) {
  if (depth > 4) return '[REDACTED_DEPTH]';
  if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitize(v, depth + 1));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SECRET_KEYS.test(key) ? '[REDACTED]' : sanitize(item, depth + 1)
  ]));
}

function log(level, event, fields = {}) {
  const record = sanitize({ timestamp: new Date().toISOString(), level, event, ...fields });
  const line = JSON.stringify(record);
  if (level === 'error') console.error(line);
  else console.log(line);
}

module.exports = {
  info: (event, fields) => log('info', event, fields),
  error: (event, fields) => log('error', event, fields),
  sanitize
};