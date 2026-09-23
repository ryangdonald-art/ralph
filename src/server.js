const express = require('express');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const logger = require('./telemetry/logger');
const { AppError } = require('./domain/errors');
const { validateDeal } = require('./security/validateDeal');
const { requireAuth, authConfigured } = require('./security/requireAuth');
const { requireAuthorization } = require('./security/requireAuthorization');
const { legacyRepositories } = require('./repositories/jsonRepository');
const { createServices } = require('./services/resourceServices');
const { SupabaseRestRepository } = require('./repositories/supabaseRestRepository');
const { persistSyntheticLoop, approveAndExecute } = require('./services/cashFlowLoop');

const anyMember = requireAuthorization(['ADMIN', 'OPERATOR', 'VIEWER']);
const canOperate = requireAuthorization(['ADMIN', 'OPERATOR']);

function createApp({ services = createServices(legacyRepositories(config.dataDir)) } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: config.requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.requestBodyLimit }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { etag: true, maxAge: 0 }));

  app.get('/api/health', (req, res) => res.json({ ok: true, app: 'RALPH', status: 'live', authConfigured: authConfigured(), requestId: req.requestId }));

  app.get('/api/auth/config', (req, res) => {
    if (!authConfigured()) throw new AppError('AUTH_NOT_CONFIGURED', 'authentication is not configured');
    res.json({ supabaseUrl: config.supabaseUrl, supabasePublishableKey: config.supabasePublishableKey, requestId: req.requestId });
  });

  app.get('/api/auth/me', requireAuth, anyMember, (req, res) => res.json({ authenticated: true, user: req.identity, membership: req.membership, requestId: req.requestId }));

  // Legacy JSON routes remain temporary, but are no longer reachable by authentication alone.
  app.get('/api/deals', requireAuth, anyMember, (_req, res, next) => { try { res.json(services.deals.list()); } catch (e) { next(e); } });
  app.post('/api/deals', requireAuth, canOperate, (req, res, next) => {
    try {
      const deal = services.deals.create(validateDeal(req.body));
      res.status(201).json(deal);
    } catch (e) { next(e); }
  });
  app.get('/api/signals', requireAuth, anyMember, (_req, res, next) => { try { res.json(services.signals.list()); } catch (e) { next(e); } });
  app.get('/api/posts', requireAuth, anyMember, (_req, res, next) => { try { res.json(services.posts.list()); } catch (e) { next(e); } });

  function liveRepo(req) {
    if (config.storageProvider !== 'supabase') throw new AppError('STORAGE_UNAVAILABLE','Production persistence is not enabled',503);
    return new SupabaseRestRepository({ baseUrl:config.supabaseUrl, publishableKey:config.supabasePublishableKey, accessToken:req.accessToken, organizationKey:req.membership.organization_key });
  }

  app.get('/api/attention', requireAuth, anyMember, async (req,res,next) => {
    try {
      const repo=liveRepo(req);
      const rows=await repo.list('actions','organization_key=eq.'+encodeURIComponent(req.membership.organization_key)+'&status=eq.AWAITING_APPROVAL&select=id,decision_id,action_type,requested_action,permission_level,status,created_at&order=created_at.desc&limit=20');
      res.json({items:rows,requestId:req.requestId});
    } catch(e){ next(e); }
  });

  app.post('/api/synthetic/cash-flow', requireAuth, canOperate, async (req,res,next) => {
    try {
      const result=await persistSyntheticLoop({repo:liveRepo(req),userId:req.identity.id});
      res.status(201).json({...result,requestId:req.requestId});
    } catch(e){ next(e); }
  });

  app.post('/api/actions/:id/approve-execute', requireAuth, canOperate, async (req,res,next) => {
    try {
      const result=await approveAndExecute({repo:liveRepo(req),userId:req.identity.id,actionId:req.params.id});
      res.json({...result,requestId:req.requestId});
    } catch(e){ next(e); }
  });

  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

  app.use((error, req, res, _next) => {
    const appError = error instanceof AppError ? error : new AppError('INTERNAL_ERROR', 'internal server error');
    logger.error('request_error', {
      requestId: req.requestId,
      errorCode: appError.code,
      errorName: error && error.name,
      message: appError.code === 'INTERNAL_ERROR' ? 'Internal request failure' : appError.message
    });
    res.status(appError.status).json({ error: { code: appError.code, message: appError.message }, requestId: req.requestId });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(config.port, () => logger.info('server_started', { port: config.port, environment: config.nodeEnv, storageProvider: config.storageProvider, authConfigured: authConfigured() }));
}

module.exports = { createApp };