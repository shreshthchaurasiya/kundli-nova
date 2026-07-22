import { Router } from 'express';
import { getDailyHoroscope, getKundli, getDasha, getDosha } from '../../controllers/astrology';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/horoscope/daily', getDailyHoroscope);
router.get('/kundli/:profileId', getKundli);
router.get('/dasha/:profileId', getDasha);
router.get('/dosha/:profileId', getDosha);

export default router;
