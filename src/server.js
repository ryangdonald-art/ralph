const express = require('express');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const logger = require('./telemetry/logger');
const { AppError } = require('./domain/errors');
const { validateDeal } = require('./security/validateDeal');
const { legacyRepositories } = require('./repositories/jsonRepository');
const { createServices } = require('./services/resourceServices');

function createApp({ services = createServices(legacyRepositories(config.dataDir)) } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    // Do not trust arbitrary inbound correlation IDs at this stage.
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });
  app.use(express.json({ limit: config.requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.requestBodyLimit }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (req, res) => res.json({ ok: true, app: 'RALPH', status: 'live', requestId: req.requestId }));
  app.get('/api/deals', (_req, res, next) => { try { res.json(services.deals.list()); } catch (e) { next(e); } });
  app.post('/api/deals', (req, res, next) => {
    try {
      // DEVELOPMENT / NOT PRODUCTION SAFE until authentication is implemented.
      const deal = services.deals.create(validateDeal(req.body));
      res.status(201).json(deal);
    } catch (e) { next(e); }
  });
  app.get('/api/signals', (_req, res, next) => { try { res.json(services.signals.list()); } catch (e) { next(e); } });
  app.get('/api/posts', (_req, res, next) => { try { res.json(services.posts.list()); } catch (e) { next(e); } });

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
  app.listen(config.port, () => logger.info('server_started', { port: config.port, environment: config.nodeEnv, storageProvider: config.storageProvider }));
}

module.exports = { createApp };