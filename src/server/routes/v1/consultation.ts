import { Router } from 'express';
import { 
  createSession, 
  listSessions,
  getActiveSession, 
  getSessionById, 
  heartbeatSession, 
  endSession,
  expireSession,
  acceptAssignedSession,
  rejectAssignedSession,
  cancelWaitingSession,
  endAssignedSession,
} from '../../controllers/consultation';
import { getMessages, sendMessage } from '../../controllers/chat';
import { requireAuth } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { createConsultationSchema, consultationIdSchema, consultationMessageSchema } from '../../validation';
import type { AuthenticatedRequest } from '../../types';

import { env } from '../../config/env';
import rateLimit from 'express-rate-limit';

const heartbeatPreAuthLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_PREAUTH_WINDOW_MS,
  max: env.RATE_LIMIT_PREAUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many requests, please wait'
    });
  }
});

const heartbeatUserSessionLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_HEARTBEAT_WINDOW_MS,
  max: env.RATE_LIMIT_HEARTBEAT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, xForwardedForHeader: false },
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    return `${authReq.user!.id}:${req.params.id}`;
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      status: 'error',
      code: 'RATE_LIMITED',
      message: options.message,
    });
  }
});

const router = Router();

// 1. Mount pre-auth limiter for heartbeat explicitly BEFORE requireAuth
router.post('/:id/heartbeat', heartbeatPreAuthLimiter);

router.use(requireAuth);

router.get('/', listSessions);
router.post('/', validateRequest(createConsultationSchema), createSession);
router.get('/active', getActiveSession);
router.get('/:id', validateRequest(consultationIdSchema), getSessionById);
router.post('/:id/heartbeat', heartbeatUserSessionLimiter, validateRequest(consultationIdSchema), heartbeatSession);
router.post('/:id/end', validateRequest(consultationIdSchema), endSession);
router.post('/:id/astrologer-end', validateRequest(consultationIdSchema), endAssignedSession);
router.post('/:id/expire', validateRequest(consultationIdSchema), expireSession);
router.post('/:id/accept', validateRequest(consultationIdSchema), acceptAssignedSession);
router.post('/:id/reject', validateRequest(consultationIdSchema), rejectAssignedSession);
router.post('/:id/cancel', validateRequest(consultationIdSchema), cancelWaitingSession);
router.get('/:id/messages', validateRequest(consultationIdSchema), getMessages);
router.post('/:id/messages', validateRequest(consultationMessageSchema), sendMessage);

export default router;
