import { Router } from 'express';
import { 
  createSession, 
  listSessions,
  getActiveSession, 
  getSessionById, 
  heartbeatSession, 
  endSession,
  transitionSessionForDevelopment,
  expireSession,
} from '../../controllers/consultation';
import { getMessages, sendMessage } from '../../controllers/chat';
import { requireAuth } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { createConsultationSchema, consultationIdSchema, consultationTransitionSchema } from '../../validation';

const router = Router();

router.use(requireAuth);

router.get('/', listSessions);
router.post('/', validateRequest(createConsultationSchema), createSession);
router.get('/active', getActiveSession);
router.get('/:id', validateRequest(consultationIdSchema), getSessionById);
router.post('/:id/heartbeat', validateRequest(consultationIdSchema), heartbeatSession);
router.post('/:id/end', validateRequest(consultationIdSchema), endSession);
router.post('/:id/expire', validateRequest(consultationIdSchema), expireSession);
router.post('/:id/dev-transition', validateRequest(consultationTransitionSchema), transitionSessionForDevelopment);
router.get('/:id/messages', validateRequest(consultationIdSchema), getMessages);
router.post('/:id/messages', validateRequest(consultationIdSchema), sendMessage);

export default router;
