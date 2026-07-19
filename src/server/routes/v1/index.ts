import { Router } from 'express';
import walletRoutes from './wallet';
import consultationRoutes from './consultation';
import profileRoutes from './profile';
import kundliRoutes from './kundli';
import authRoutes from './auth';

const router = Router();

// API Healthcheck
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is healthy' });
});

router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/consultations', consultationRoutes);
router.use('/profile', profileRoutes);
router.use('/kundli-profiles', kundliRoutes);

export default router;
