const config = require('../config');
const { AppError } = require('../domain/errors');

function authConfigured() {
  return Boolean(config.supabaseUrl && config.supabasePublishableKey);
}

async function verifyAccessToken(accessToken) {
  if (!authConfigured()) throw new AppError('AUTH_NOT_CONFIGURED', 'authentication is not configured', 503);
  if (!accessToken) throw new AppError('AUTH_REQUIRED', 'authentication required', 401);

  let response;
  try {
    response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: config.supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`
      },
      signal: AbortSignal.timeout(5000)
    });
  } catch (_error) {
    throw new AppError('AUTH_UNAVAILABLE', 'authentication service unavailable', 503);
  }

  if (!response.ok) throw new AppError('AUTH_INVALID', 'invalid or expired authentication', 401);
  const user = await response.json();
  if (!user || !user.id) throw new AppError('AUTH_INVALID', 'invalid authentication identity', 401);
  return Object.freeze({ id: user.id, email: user.email || null });
}

async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    req.identity = await verifyAccessToken(match ? match[1] : '');
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authConfigured, verifyAccessToken, requireAuth };