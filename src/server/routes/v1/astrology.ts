import { Router } from 'express';
import { getDailyHoroscope } from '../../controllers/astrology';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/horoscope/daily', getDailyHoroscope);

export default router;
