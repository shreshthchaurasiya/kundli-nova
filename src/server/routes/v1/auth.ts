import { Router } from 'express';
import { devLogin } from '../../controllers/auth';

const router = Router();

// Note: Does NOT use requireAuth because this is the login endpoint!
router.post('/dev-login', devLogin);

export default router;
