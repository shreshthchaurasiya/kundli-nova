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

const router = Router();

router.use(requireAuth);

router.get('/', listSessions);
router.post('/', validateRequest(createConsultationSchema), createSession);
router.get('/active', getActiveSession);
router.get('/:id', validateRequest(consultationIdSchema), getSessionById);
router.post('/:id/heartbeat', validateRequest(consultationIdSchema), heartbeatSession);
router.post('/:id/end', validateRequest(consultationIdSchema), endSession);
router.post('/:id/astrologer-end', validateRequest(consultationIdSchema), endAssignedSession);
router.post('/:id/expire', validateRequest(consultationIdSchema), expireSession);
router.post('/:id/accept', validateRequest(consultationIdSchema), acceptAssignedSession);
router.post('/:id/reject', validateRequest(consultationIdSchema), rejectAssignedSession);
router.post('/:id/cancel', validateRequest(consultationIdSchema), cancelWaitingSession);
router.get('/:id/messages', validateRequest(consultationIdSchema), getMessages);
router.post('/:id/messages', validateRequest(consultationMessageSchema), sendMessage);

export default router;
