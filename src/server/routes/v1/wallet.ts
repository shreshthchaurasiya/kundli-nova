import { Router } from 'express';
import { getWallet, getTransactions } from '../../controllers/wallet';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getWallet);
router.get('/transactions', getTransactions);
// Wallet credits are created only by the verified Razorpay Edge Function.
// Consultation debits are created only by the server-side billing RPC.

export default router;
