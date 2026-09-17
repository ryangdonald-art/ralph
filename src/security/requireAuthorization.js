const config = require('../config');
const { AppError } = require('../domain/errors');

const ROLES = Object.freeze(['ADMIN', 'OPERATOR', 'VIEWER']);

async function loadMembership(req) {
  if (!req.identity || !req.identity.id || !req.accessToken) {
    throw new AppError('AUTH_REQUIRED', 'authentication required', 401);
  }

  let response;
  try {
    const params = new URLSearchParams({
      user_id: `eq.${req.identity.id}`,
      select: 'user_id,organization_key,role,active'
    });
    response = await fetch(`${config.supabaseUrl}/rest/v1/app_members?${params}`, {
      method: 'GET',
      headers: {
        apikey: config.supabasePublishableKey,
        Authorization: `Bearer ${req.accessToken}`,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
  } catch (_error) {
    throw new AppError('AUTHZ_UNAVAILABLE', 'authorization service unavailable', 503);
  }

  if (!response.ok) throw new AppError('AUTHZ_DENIED', 'not authorized for RALPH', 403);
  const rows = await response.json();
  const membership = Array.isArray(rows) ? rows[0] : null;
  if (!membership || membership.active !== true || !ROLES.includes(membership.role)) {
    throw new AppError('AUTHZ_DENIED', 'not authorized for RALPH', 403);
  }
  if (membership.user_id !== req.identity.id) {
    throw new AppError('AUTHZ_DENIED', 'authorization identity mismatch', 403);
  }
  return Object.freeze(membership);
}

function requireAuthorization(allowedRoles = ROLES) {
  const allowed = new Set(allowedRoles);
  return async function authorize(req, _res, next) {
    try {
      const membership = await loadMembership(req);
      if (!allowed.has(membership.role)) throw new AppError('AUTHZ_DENIED', 'insufficient authority', 403);
      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { ROLES, loadMembership, requireAuthorization };
