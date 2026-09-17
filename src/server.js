const express = require('express');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const logger = require('./telemetry/logger');
const { AppError } = require('./domain/errors');
const { validateDeal } = require('./security/validateDeal');
const { requireAuth, authConfigured } = require('./security/requireAuth');
const { legacyRepositories } = require('./repositories/jsonRepository');
const { createServices } = require('./services/resourceServices');

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

  // Public configuration contains only values designed for browser use.
  app.get('/api/auth/config', (req, res) => {
    if (!authConfigured()) throw new AppError('AUTH_NOT_CONFIGURED', 'authentication is not configured');
    res.json({ supabaseUrl: config.supabaseUrl, supabasePublishableKey: config.supabasePublishableKey, requestId: req.requestId });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ authenticated: true, user: req.identity, requestId: req.requestId }));

  // Phase A: identity is required for every legacy business-data route. Phase B will add authorization.
  app.get('/api/deals', requireAuth, (_req, res, next) => { try { res.json(services.deals.list()); } catch (e) { next(e); } });
  app.post('/api/deals', requireAuth, (req, res, next) => {
    try {
      const deal = services.deals.create(validateDeal(req.body));
      res.status(201).json(deal);
    } catch (e) { next(e); }
  });
  app.get('/api/signals', requireAuth, (_req, res, next) => { try { res.json(services.signals.list()); } catch (e) { next(e); } });
  app.get('/api/posts', requireAuth, (_req, res, next) => { try { res.json(services.posts.list()); } catch (e) { next(e); } });

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