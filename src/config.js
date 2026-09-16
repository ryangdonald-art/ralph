const path = require('path');

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${name}`);
  return value;
}

const storageProvider = (process.env.STORAGE_PROVIDER || 'json').toLowerCase();
if (storageProvider !== 'json') {
  throw new Error(`Unsupported STORAGE_PROVIDER: ${storageProvider}. Supabase is not configured.`);
}

module.exports = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: intEnv('PORT', 3000),
  logLevel: process.env.LOG_LEVEL || 'info',
  dataDir: path.resolve(process.env.DATA_DIRECTORY || path.join(__dirname, '..', 'data')),
  storageProvider,
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '64kb'
});