import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getHomePersonalized } from '../../controllers/home';

const router = Router();

router.use(requireAuth);

router.get('/personalized', getHomePersonalized);

export default router;
