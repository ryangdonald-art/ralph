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
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new AppError('AUTHZ_DENIED', 'not authorized for RALPH', 403);
  }
  const membership = rows[0];
  if (!membership || membership.active !== true || !ROLES.includes(membership.role)) {
    throw new AppError('AUTHZ_DENIED', 'not authorized for RALPH', 403);
  }
  if (membership.user_id !== req.identity.id) {
    throw new AppError('AUTHZ_DENIED', 'authorization identity mismatch', 403);
  }
  if (typeof membership.organization_key !== 'string' || !membership.organization_key.trim()) {
    throw new AppError('AUTHZ_DENIED', 'organization membership is required');
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

function requireLegacyOrganization(req, _res, next) {
  // These temporary JSON files are a single Dealworx dataset, not a tenant store.
  if (req.membership?.organization_key !== 'dealworx') {
    return next(new AppError('AUTHZ_DENIED', 'legacy dataset is not available for this organization'));
  }
  next();
}

module.exports = { ROLES, loadMembership, requireAuthorization, requireLegacyOrganization };
