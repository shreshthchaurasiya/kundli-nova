import { Router } from 'express';
import { getWallet, getTransactions, rechargeWallet } from '../../controllers/wallet';
import { requireAuth } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { rechargeSchema } from '../../validation';

const router = Router();

router.use(requireAuth);

router.get('/', getWallet);
router.get('/transactions', getTransactions);
router.post('/recharge', validateRequest(rechargeSchema), rechargeWallet);

// Note: debit is internally managed via RPC during consultation heartbeats.
// Clients should not directly debit the wallet via an exposed API endpoint.

export default router;
