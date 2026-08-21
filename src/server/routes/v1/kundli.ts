import { Router } from 'express';
import { 
  listKundliProfiles, 
  getKundliProfile, 
  createKundliProfile, 
  updateKundliProfile, 
  deleteKundliProfile,
  ensureSelfKundliProfile
} from '../../controllers/kundli';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listKundliProfiles);
router.post('/', createKundliProfile);
router.post('/sync-self', ensureSelfKundliProfile); // must be before /:id wildcard
router.get('/:id', getKundliProfile);
router.patch('/:id', updateKundliProfile);
router.delete('/:id', deleteKundliProfile);

export default router;
