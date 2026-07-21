import { Router } from 'express';
import { getDailyHoroscope, getKundli } from '../../controllers/astrology';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/horoscope/daily', getDailyHoroscope);
router.get('/kundli/:profileId', getKundli);

export default router;
