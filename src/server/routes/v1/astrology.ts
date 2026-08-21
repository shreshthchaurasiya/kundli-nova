import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getDailyHoroscope, getKundli, getDasha, getDosha, getYoga, getCompatibility, getDetailedKundliReport, getDailyAstrologyData, getDailyInsights } from '../../controllers/astrology';

const router = Router();

// Authenticated routes
router.use(requireAuth);

router.get('/horoscope/daily', getDailyHoroscope);
router.get('/kundli/:profileId', getKundli);
router.get('/dasha/:profileId', getDasha);
router.get('/dosha/:profileId', getDosha);
router.get('/yoga/:profileId', getYoga);
router.get('/kundli/:profileId/detailed-report', getDetailedKundliReport);
router.get('/compatibility', getCompatibility);
router.get('/daily-data', getDailyAstrologyData);
router.get('/daily-insights', getDailyInsights);

export default router;
