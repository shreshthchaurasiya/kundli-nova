import fs from 'fs';
const file = 'src/server/controllers/consultation.ts';
let content = fs.readFileSync(file, 'utf8');

// Add createAuthClient import if needed
if (!content.includes('createAuthClient')) {
  content = content.replace("import { supabaseAdmin } from '../config/supabase';", "import { supabaseAdmin, createAuthClient } from '../config/supabase';");
}

// Modify createSession
const createSessionOld = `export const createSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await runSessionRpc('create_consultation_session', {
      p_user_id: req.user!.id,
      p_astrologer_id: req.body.astrologerId,
      p_kundli_profile_id: req.body.kundliProfileId || null,
    });`;

const createSessionNew = `export const createSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let resolvedProfileId = req.body.kundliProfileId || null;

    if (!resolvedProfileId) {
      // 1. Try to find owned is_default = true profile
      // 2. Try to find owned relation = 'self' profile
      const { data: profiles } = await supabaseAdmin
        .from('kundli_profiles')
        .select('id, is_default, relation')
        .eq('owner_id', req.user!.id)
        .order('is_default', { ascending: false })
        .order('relation', { ascending: false })
        .limit(20);
        
      if (profiles && profiles.length > 0) {
        const defaultProfile = profiles.find(p => p.is_default);
        if (defaultProfile) {
          resolvedProfileId = defaultProfile.id;
        } else {
          const selfProfile = profiles.find(p => p.relation === 'self');
          if (selfProfile) {
            resolvedProfileId = selfProfile.id;
          }
        }
      }

      // 3. Fallback to ensure_self_kundli_profile RPC
      if (!resolvedProfileId) {
        const userClient = createAuthClient(req.token!);
        const { data, error } = await userClient.rpc('ensure_self_kundli_profile');
        if (!error && data) {
          const rpcResult = data as { profile: any; reason: string };
          if (rpcResult.profile) {
            resolvedProfileId = rpcResult.profile.id;
          }
        }
      }
    }

    const result = await runSessionRpc('create_consultation_session', {
      p_user_id: req.user!.id,
      p_astrologer_id: req.body.astrologerId,
      p_kundli_profile_id: resolvedProfileId,
    });`;

content = content.replace(createSessionOld, createSessionNew);

const updateSessionKundliProfileFunc = `
export const updateSessionKundliProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.id;
    const { kundliProfileId } = req.body;
    
    if (!kundliProfileId) throw new ApiError(400, 'kundliProfileId is required');

    // Verify session ownership and get current state
    const session = await requireOwnedSession(sessionId, req.user!.id);
    
    // Allowed states for updating the profile
    const allowedStates = ['WAITING_FOR_ASTROLOGER', 'ACTIVE', 'LOW_BALANCE', 'RECHARGING'];
    if (!allowedStates.includes(session.status)) {
      throw new ApiError(403, \`Cannot switch profile in state \${session.status}\`);
    }

    // Verify the requested profile is owned by this user
    const { data: profileCheck, error: profileErr } = await supabaseAdmin
      .from('kundli_profiles')
      .select('id')
      .eq('id', kundliProfileId)
      .eq('owner_id', req.user!.id)
      .single();

    if (profileErr || !profileCheck) {
      throw new ApiError(403, 'Profile not found or not owned by user');
    }

    // Update atomically, ensuring it still matches the status logic just in case
    const { data: updatedSession, error: updateErr } = await supabaseAdmin
      .from('consultation_sessions')
      .update({ kundli_profile_id: kundliProfileId })
      .eq('id', sessionId)
      .eq('user_id', req.user!.id)
      .in('status', allowedStates)
      .select()
      .single();

    if (updateErr || !updatedSession) {
      throw new ApiError(409, 'Failed to update session profile or state changed');
    }

    res.status(200).json({ status: 'success', data: serializeSession(updatedSession as unknown as SessionRow) });
  } catch (error) {
    next(error);
  }
};
`;

content += updateSessionKundliProfileFunc;

fs.writeFileSync(file, content);
console.log('Patched consultation controller');
