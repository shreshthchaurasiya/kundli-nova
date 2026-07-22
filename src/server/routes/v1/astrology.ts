import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getDailyHoroscope, getKundli, getDasha, getDosha, getYoga, getCompatibility } from '../../controllers/astrology';

const router = Router();

// Public routes
router.get('/horoscope/daily', getDailyHoroscope);

// Authenticated routes
router.use(requireAuth);
router.get('/kundli/:profileId', getKundli);
router.get('/dasha/:profileId', getDasha);
router.get('/dosha/:profileId', getDosha);
router.get('/yoga/:profileId', getYoga);
router.get('/compatibility', getCompatibility);

export default router;
