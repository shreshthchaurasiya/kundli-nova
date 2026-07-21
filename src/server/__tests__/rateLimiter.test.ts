import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// We create isolated limiters for each test so they don't leak state
describe('Rate Limiter Ordering & Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unauthenticated heartbeat is blocked by preAuth limiter', async () => {
    const testApp = express();

    const preAuthLimiter = rateLimit({
      windowMs: 60000,
      max: 5, // Custom low limit for quick test
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next, options) => {
        res.status(options.statusCode).json({ status: 'error', code: 'RATE_LIMITED' });
      }
    });

    testApp.post('/heartbeat', preAuthLimiter, (req, res) => res.json({ status: 'ok' }));

    const agent = request(testApp);

    for (let i = 0; i < 5; i++) {
      const res = await agent.post('/heartbeat');
      expect(res.status).toBe(200);
    }

    const res429 = await agent.post('/heartbeat');
    expect(res429.status).toBe(429);
    expect(res429.body.code).toBe('RATE_LIMITED');
  });

  it('global limiter skips heartbeat based on regex', async () => {
    const testApp = express();

    const globalLimiter = rateLimit({
      windowMs: 900000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        return /^\/v1\/consultations\/[^\/]+\/heartbeat\/?$/.test(req.path);
      },
      handler: (req, res, next, options) => {
        res.status(options.statusCode).json({ status: 'error', code: 'GLOBAL_LIMITED' });
      }
    });

    testApp.use('/api', globalLimiter);
    testApp.get('/api/v1/consultations', (req, res) => res.json({ status: 'ok' }));
    testApp.post('/api/v1/consultations/sess1/heartbeat', (req, res) => res.json({ status: 'ok' }));

    const agent = request(testApp);

    // Exhaust global limiter on normal route
    for (let i = 0; i < 5; i++) {
      await agent.get('/api/v1/consultations');
    }

    const normalRes = await agent.get('/api/v1/consultations');
    expect(normalRes.status).toBe(429);
    expect(normalRes.body.code).toBe('GLOBAL_LIMITED');

    // Heartbeat route should bypass the global limiter because of `skip`
    const hbRes = await agent.post('/api/v1/consultations/sess1/heartbeat');
    expect(hbRes.status).toBe(200);
  });

  it('heartbeat user session limiter works properly (max 5)', async () => {
    const testApp = express();

    const heartbeatUserSessionLimiter = rateLimit({
      windowMs: 900000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `u1:${req.params.id}`,
      handler: (req, res, next, options) => {
        res.status(options.statusCode).json({ status: 'error', code: 'RATE_LIMITED' });
      }
    });

    // Mock requireAuth
    const requireAuth = (req: Request, res: Response, next: NextFunction) => {
      (req as any).user = { id: 'u1' };
      next();
    };

    testApp.post('/heartbeat/:id', requireAuth, heartbeatUserSessionLimiter, (req, res) => res.json({ status: 'ok' }));

    const agent = request(testApp);

    for (let i = 0; i < 5; i++) {
      const res = await agent.post('/heartbeat/sess1');
      expect(res.status).toBe(200);
    }

    const res429 = await agent.post('/heartbeat/sess1');
    expect(res429.status).toBe(429);
    expect(res429.body.code).toBe('RATE_LIMITED');
    expect(res429.headers['retry-after']).toBeDefined();

    // Different session ID does not get rate limited
    const otherSess = await agent.post('/heartbeat/sess2');
    expect(otherSess.status).toBe(200);
  });
});
