import { ApiClient } from '../../services/api/apiClient';
import { ASTROLOGER_WORKSPACE } from '../../services/api/endpoints';

export interface WorkspaceData {
  profile: any | null;
  report: any | null;
  notes: string;
}

export const getWorkspaceData = async (sessionId: string): Promise<WorkspaceData> => {
  return await ApiClient.get<WorkspaceData>(ASTROLOGER_WORKSPACE.GET(sessionId));
};

export const updatePrivateNotes = async (sessionId: string, notes: string): Promise<{ notes: string; updated_at: string }> => {
  return await ApiClient.post<{ notes: string; updated_at: string }>(ASTROLOGER_WORKSPACE.UPDATE_NOTES(sessionId), {
    body: { notes },
  });
};
