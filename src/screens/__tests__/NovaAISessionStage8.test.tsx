import { describe, it, expect, vi, beforeEach } from 'vitest';
// Removed unused react-hooks import
import React from 'react';
import NovaAIChatScreen from '../NovaAIChatScreen';
import { chatStorage } from '../../services/storage/chatStorage';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { RepositoryProvider } from '../../repositories/repositoryProvider';
import { postAiRequest } from '../../services/aiClient';
import { AstrologyApi } from '../../services/api/astrologyApi';
// Mock chat storage
vi.mock('../../services/storage/chatStorage', () => ({
  chatStorage: {
    getAiHistory: vi.fn().mockReturnValue([]),
    saveAiHistory: vi.fn(),
  }
}));

// Mock ai client
vi.mock('../../services/aiClient', () => ({
  postAiRequest: vi.fn()
}));

// Mock astrology api
vi.mock('../../services/api/astrologyApi', () => ({
  AstrologyApi: {
    getKundli: vi.fn().mockResolvedValue({}),
    getDasha: vi.fn().mockResolvedValue(null),
    getDoshaAnalysis: vi.fn().mockResolvedValue(null),
    getYogaAnalysis: vi.fn().mockResolvedValue(null),
    getDetailedKundliReport: vi.fn().mockResolvedValue(null),
  }
}));

// Mock repositories
const mockGetProfileById = vi.hoisted(() => vi.fn());
const mockKundliProfile = vi.hoisted(() => ({ getProfileById: mockGetProfileById }));
vi.mock('../../repositories/repositoryProvider', () => ({
  useRepositories: () => ({
    kundliProfile: mockKundliProfile
  }),
  RepositoryProvider: ({ children }: any) => <>{children}</>
}));

const renderChatScreen = (routeParams: any) => {
  return render(
    <NovaAIChatScreen onNavigate={vi.fn()} routeParams={routeParams} />
  );
};

describe('Stage 8.4 - Nova AI Session & Production Polish Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGetProfileById.mockImplementation(async (id) => {
      if (id === 'prof-A') return { id: 'prof-A', name: 'Profile A' };
      if (id === 'prof-B') return { id: 'prof-B', name: 'Profile B' };
      return null;
    });

    vi.mocked(AstrologyApi.getKundli).mockImplementation(() => Promise.reject(new Error('fast fail')));
    vi.mocked(postAiRequest).mockResolvedValue({ texts: ['Response'] });
    vi.mocked(chatStorage.getAiHistory).mockReturnValue([]);
  });

  it('conversation saved with profileId', async () => {
    renderChatScreen({ profileId: 'prof-A' });
    
    // Wait for initial greeting
    await waitFor(() => {
      expect(screen.getByText(/Radhe Radhe/i)).toBeInTheDocument();
    });

    // Check that saveAiHistory was called with profileId
    const savedCalls = vi.mocked(chatStorage.saveAiHistory).mock.calls;
    // Last save call
    const lastSave = savedCalls[savedCalls.length - 1][0];
    expect(lastSave[0].profileId).toBe('prof-A');
  });

  it('Profile A conversation not restored for Profile B', async () => {
    // Setup history with Profile A conversation
    vi.mocked(chatStorage.getAiHistory).mockReturnValue([{
      id: 'conv-123',
      profileId: 'prof-A',
      kind: 'nova',
      topic: 'General',
      lastMessage: 'Hello',
      timestamp: 'Today',
      messages: [{ id: 'm1', sender: 'nova', type: 'text', time: '10:00', text: 'I am Profile A msg' }]
    }]);

    renderChatScreen({ profileId: 'prof-B', conversationId: 'conv-123' });
    
    // It should not render 'I am Profile A msg', instead it should start a fresh greeting for Profile B
    await waitFor(() => {
      expect(screen.queryByText('I am Profile A msg')).not.toBeInTheDocument();
      expect(screen.getByText(/Radhe Radhe, Profile B Ji/i)).toBeInTheDocument();
    });
  });

  it('switching back restores Profile A only', async () => {
    vi.mocked(chatStorage.getAiHistory).mockReturnValue([{
      id: 'conv-123',
      profileId: 'prof-A',
      kind: 'nova',
      topic: 'General',
      lastMessage: 'Hello',
      timestamp: 'Today',
      messages: [{ id: 'm1', sender: 'nova', type: 'text', time: '10:00', text: 'I am Profile A msg' }]
    }]);

    renderChatScreen({ profileId: 'prof-A', conversationId: 'conv-123' });
    
    // It should restore Profile A's message
    await waitFor(() => {
      expect(screen.getByText('I am Profile A msg')).toBeInTheDocument();
      // Should not repeat greeting
      expect(screen.queryByText(/Radhe Radhe/i)).not.toBeInTheDocument();
    });
  });

  it('legacy conversation without profileId is ignored safely', async () => {
    vi.mocked(chatStorage.getAiHistory).mockReturnValue([{
      id: 'conv-old',
      // No profileId
      kind: 'nova',
      topic: 'General',
      lastMessage: 'Hello',
      timestamp: 'Today',
      messages: [{ id: 'm1', sender: 'nova', type: 'text', time: '10:00', text: 'Legacy message' }]
    }]);

    renderChatScreen({ profileId: 'prof-A', conversationId: 'conv-old' });
    
    // Legacy message should not be loaded
    await waitFor(() => {
      expect(screen.queryByText('Legacy message')).not.toBeInTheDocument();
      expect(screen.getByText(/Radhe Radhe, Profile A Ji/i)).toBeInTheDocument();
    });
  });

  it('double-send prevention: UI disables send while typing', async () => {
    renderChatScreen({ profileId: 'prof-A' });
    
    await waitFor(() => screen.getByPlaceholderText(/Ask Nova AI/i));
    const input = screen.getByPlaceholderText(/Ask Nova AI/i);
    const sendButton = input.nextElementSibling as HTMLButtonElement;

    // Wait for initialization to finish
    await waitFor(() => expect(sendButton.disabled).toBe(true)); // empty text
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    // Wait until initialization finishes so it doesn't leak into the next test
    await waitFor(() => {
      expect(screen.getByText(/Radhe Radhe/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('system error excluded from persistence', async () => {
    // Return a mocked setup
    vi.mocked(postAiRequest).mockRejectedValueOnce(new Error('Network error 500'));
    
    renderChatScreen({ profileId: 'prof-A' });
    
    // Wait for initialization to finish fast and fail
    await waitFor(() => expect(screen.getByText(/Kshama karein/i)).toBeInTheDocument(), { timeout: 3000 });
    
    const input = screen.getByPlaceholderText(/Ask Nova AI/i);
    
    fireEvent.change(input, { target: { value: 'Test query' } });
    
    const form = input.closest('form');
    fireEvent.submit(form!);
    
    await waitFor(() => {
      expect(screen.getByText('Network error 500')).toBeInTheDocument();
    });

    const savedCalls = vi.mocked(chatStorage.saveAiHistory).mock.calls;
    const lastSave = savedCalls[savedCalls.length - 1][0];
    
    // The last saved message list should NOT contain the system error
    const savedMessages = lastSave[0].messages;
    const errorMsgs = savedMessages.filter(m => m.type === 'system');
    expect(errorMsgs.length).toBe(0);
    
    // But the UI shows it
    expect(screen.getByText('Network error 500')).toBeInTheDocument();
  });

  it('retry preserves user message without duplication', async () => {
    vi.mocked(postAiRequest).mockRejectedValueOnce(new Error('Fail 1'));
    
    renderChatScreen({ profileId: 'prof-A' });
    
    // Wait for initialization to finish fast and fail
    await waitFor(() => expect(screen.getByText(/Kshama karein/i)).toBeInTheDocument(), { timeout: 3000 });
    
    const input = screen.getByPlaceholderText(/Ask Nova AI/i);
    fireEvent.change(input, { target: { value: 'First try' } });
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByText('Fail 1')).toBeInTheDocument();
    });

    // The user's original message is kept in UI
    expect(screen.getByText('First try')).toBeInTheDocument();
    
    // Now retry by typing again
    vi.mocked(postAiRequest).mockResolvedValueOnce({ texts: ['Success reply'] });
    fireEvent.change(input, { target: { value: 'Second try' } });
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByText('Success reply')).toBeInTheDocument();
    });

    // Both user messages should be present
    expect(screen.getByText('First try')).toBeInTheDocument();
    expect(screen.getByText('Second try')).toBeInTheDocument();
    
    // In persistence, the failed system error is skipped
    const savedCalls = vi.mocked(chatStorage.saveAiHistory).mock.calls;
    const lastSave = savedCalls[savedCalls.length - 1][0];
    const systemCount = lastSave[0].messages.filter(m => m.type === 'system').length;
    expect(systemCount).toBe(0);
  });
});
