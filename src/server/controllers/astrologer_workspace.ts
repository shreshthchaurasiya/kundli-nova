import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import type { AuthenticatedRequest } from '../types';
import { ApiError } from '../errors/ApiError';
import { z } from 'zod';

const updateNotesSchema = z.object({
  notes: z.string().max(10000), // arbitrary reasonable limit
});

export const getWorkspaceData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const astrologerUserId = req.user!.id;
    const { sessionId } = req.params;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new ApiError(400, 'Invalid session ID');
    }

    // 1. Fetch the consultation session and verify ownership & status
    // Note: We use !inner to enforce the join condition filters out non-matching rows
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('consultation_sessions')
      .select(`
        id, 
        astrologer_id, 
        kundli_profile_id, 
        status,
        astrologers!inner ( user_id )
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      throw new ApiError(500, 'Failed to fetch session');
    }

    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    // Ensure the user calling this is the assigned astrologer
    // Because of the inner join, astrologers will be an object or array, supabase js returns object for !inner usually if 1-1, but since astrologers to sessions is 1-many it might be an object if we selected correctly. Let's cast and check safely.
    const assignedUserId = Array.isArray(session.astrologers) ? session.astrologers[0]?.user_id : (session.astrologers as any)?.user_id;

    if (assignedUserId !== astrologerUserId) {
      throw new ApiError(403, 'Unauthorized access to this consultation');
    }

    // Ensure consultation is active
    const activeStatuses = ['WAITING_FOR_ASTROLOGER', 'ACTIVE', 'LOW_BALANCE', 'RECHARGING'];
    if (!activeStatuses.includes(session.status)) {
      throw new ApiError(403, 'Workspace access is only permitted during an active consultation');
    }

    // 2. Fetch Kundli Profile (if attached)
    let profileData = null;
    let reportData = null;

    if (session.kundli_profile_id) {
      const { data: profile } = await supabaseAdmin
        .from('kundli_profiles')
        .select('name, relation, gender, dob, tob, birth_city, birth_state, birth_district, is_default')
        .eq('id', session.kundli_profile_id)
        .maybeSingle();

      if (profile) {
        profileData = profile;
        
        // Fetch the latest generated report for this profile
        const { data: report } = await supabaseAdmin
          .from('kundli_reports')
          .select('id, report_json, created_at')
          .eq('profile_id', session.kundli_profile_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (report) {
          reportData = report.report_json;
        }
      }
    }

    // 3. Fetch private notes
    const { data: notes } = await supabaseAdmin
      .from('consultation_astrologer_notes')
      .select('notes, updated_at')
      .eq('session_id', sessionId)
      .eq('astrologer_id', session.astrologer_id)
      .maybeSingle();

    res.json({
      status: 'success',
      data: {
        profile: profileData,
        report: reportData,
        notes: notes?.notes ?? '',
      }
    });

  } catch (error) {
    next(error);
  }
};

export const updatePrivateNotes = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const astrologerUserId = req.user!.id;
    const { sessionId } = req.params;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new ApiError(400, 'Invalid session ID');
    }

    const { notes } = updateNotesSchema.parse(req.body);

    // Verify ownership and status
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('consultation_sessions')
      .select(`
        id, 
        astrologer_id, 
        status,
        astrologers!inner ( user_id )
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) throw new ApiError(500, 'Failed to verify session');
    if (!session) throw new ApiError(404, 'Session not found');

    const assignedUserId = Array.isArray(session.astrologers) ? session.astrologers[0]?.user_id : (session.astrologers as any)?.user_id;

    if (assignedUserId !== astrologerUserId) {
      throw new ApiError(403, 'Unauthorized access to this consultation');
    }

    const activeStatuses = ['WAITING_FOR_ASTROLOGER', 'ACTIVE', 'LOW_BALANCE', 'RECHARGING'];
    if (!activeStatuses.includes(session.status)) {
      throw new ApiError(403, 'Workspace access is only permitted during an active consultation');
    }

    // Upsert notes using ON CONFLICT (session_id, astrologer_id)
    const { data, error } = await supabaseAdmin
      .from('consultation_astrologer_notes')
      .upsert({
        session_id: sessionId,
        astrologer_id: session.astrologer_id,
        notes: notes,
      }, {
        onConflict: 'session_id, astrologer_id'
      })
      .select('notes, updated_at')
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to update private notes');
    }

    res.json({
      status: 'success',
      data: data,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ApiError(400, 'Validation error: ' + (error as any).errors[0].message));
    } else {
      next(error);
    }
  }
};
