import { Router } from 'express';
import { getProfile, updateProfile } from '../../controllers/profile';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getProfile);
router.patch('/', updateProfile);

export default router;
