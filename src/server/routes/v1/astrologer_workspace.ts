import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getWorkspaceData, updatePrivateNotes } from '../../controllers/astrologer_workspace';

const router = Router();

router.use(requireAuth);

router.get('/:sessionId', getWorkspaceData);
router.post('/:sessionId/notes', updatePrivateNotes);

export default router;
