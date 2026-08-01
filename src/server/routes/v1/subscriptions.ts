import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getMyPlan, upgradeWithWallet, getPlans } from '../../controllers/subscriptions';

const router = Router();

router.use(requireAuth);

router.get('/my-plan', getMyPlan);
router.get('/plans', getPlans);
router.post('/upgrade/wallet', upgradeWithWallet);
// Razorpay webhook is handled in payment edge functions usually, but can be added here if needed.

export default router;
