import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NovaAIChatScreen from '../NovaAIChatScreen';
import { useRepositories } from '../../repositories/repositoryProvider';
import { AstrologyApi } from '../../services/api/astrologyApi';
import { postAiRequest } from '../../services/aiClient';
import { generateKundliPdf } from '../../services/kundliPdfService';
import * as kundliService from '../../services/kundliService';

// Mock dependencies
vi.mock('../../repositories/repositoryProvider', () => ({
  useRepositories: vi.fn(),
}));

vi.mock('../../services/api/astrologyApi', () => ({
  AstrologyApi: {
    getKundli: vi.fn().mockResolvedValue({}),
    getDasha: vi.fn().mockResolvedValue(null),
    getDoshaAnalysis: vi.fn().mockResolvedValue(null),
    getYogaAnalysis: vi.fn().mockResolvedValue(null),
    getDetailedKundliReport: vi.fn().mockResolvedValue(null),
  }
}));

vi.mock('../../services/aiClient', () => ({
  postAiRequest: vi.fn(),
}));

vi.mock('../../services/kundliPdfService', () => ({
  generateKundliPdf: vi.fn(),
}));

vi.mock('../../services/kundliService', () => ({
  generateKundli: vi.fn(),
}));

vi.mock('../../components/chat/CelestialChatBackground', () => ({
  default: () => <div data-testid="chat-bg" />
}));

vi.mock('../../components/KundliPreviewMessage', () => ({
  default: ({ data, onViewComplete, onDownloadPdf }: any) => (
    <div data-testid="kundli-preview">
      {data.birthDetails?.name}
      <button data-testid="btn-view" onClick={onViewComplete}>View</button>
      <button data-testid="btn-download" onClick={onDownloadPdf}>Download</button>
    </div>
  )
}));

// Provide minimal motion mock to prevent nested framer-motion issues
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, 'data-testid': testid }: any) => <div className={className} data-testid={testid}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('Stage 8.2 - NovaAIChatScreen Identity & Flow Verification', () => {
  const mockNavigate = vi.fn();
  const mockGetProfileById = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    
    vi.mocked(AstrologyApi.getKundli).mockResolvedValue({} as any);
    vi.mocked(AstrologyApi.getDasha).mockResolvedValue(null as any);
    vi.mocked(AstrologyApi.getDoshaAnalysis).mockResolvedValue(null as any);
    vi.mocked(AstrologyApi.getYogaAnalysis).mockResolvedValue(null as any);
    vi.mocked(AstrologyApi.getDetailedKundliReport).mockResolvedValue(null as any);
    
    vi.mocked(useRepositories).mockReturnValue({
      kundliProfile: { getProfileById: mockGetProfileById },
      profile: { getProfile: vi.fn() },
    } as any);

    // Default mock behavior
    vi.mocked(postAiRequest).mockResolvedValue({ texts: ['Mock AI response'] });
  });

  it('blocks initialization when profileId is missing in routeParams', async () => {
    render(<NovaAIChatScreen onNavigate={mockNavigate} routeParams={{}} />);
    
    expect(await screen.findByText('No Kundli profile selected. Please select a profile first.')).toBeInTheDocument();
    expect(mockGetProfileById).not.toHaveBeenCalled();
    expect(postAiRequest).not.toHaveBeenCalled();
    expect(AstrologyApi.getKundli).not.toHaveBeenCalled();
  });

  it('blocks initialization when selected profile is unavailable (invalid profileId)', async () => {
    mockGetProfileById.mockResolvedValue(null);
    
    render(<NovaAIChatScreen onNavigate={mockNavigate} routeParams={{ profileId: 'invalid-id' }} />);
    
    expect(await screen.findByText('The selected profile is unavailable, incomplete, or unauthorized.')).toBeInTheDocument();
    expect(mockGetProfileById).toHaveBeenCalledWith('invalid-id');
    expect(postAiRequest).not.toHaveBeenCalled();
  });

  it('uses the selected profile name in the greeting and does not fallback to Shreshth', async () => {
    mockGetProfileById.mockResolvedValue({
      id: 'prof-123',
      name: 'Rohan Sharma',
      birthDetails: { name: 'Rohan Sharma' }
    });

    render(<NovaAIChatScreen onNavigate={mockNavigate} routeParams={{ profileId: 'prof-123' }} />);
    
    expect(await screen.findByText(/Radhe Radhe, Rohan Sharma Ji/)).toBeInTheDocument();
    expect(screen.queryByText(/Shreshth/)).not.toBeInTheDocument();
  });

  it('passes the selected profileId to the backend AI route when initial query is sent', async () => {
    mockGetProfileById.mockResolvedValue({ id: 'prof-123', name: 'TestUser' });
    
    render(<NovaAIChatScreen onNavigate={mockNavigate} routeParams={{ profileId: 'prof-123', initialQuery: 'Hello Nova' }} />);
    
    await waitFor(() => {
      expect(postAiRequest).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          profileId: 'prof-123',
          messages: expect.arrayContaining([
            expect.objectContaining({ sender: 'user', text: 'Hello Nova' })
          ])
        })
      );
    });
  });

  it('clears stale profile data when profileId changes', async () => {
    // 1. Render with first profile
    mockGetProfileById.mockResolvedValueOnce({ id: 'p1', name: 'Profile One', birthDetails: { dob: '2000-01-01' } });
    
    const { rerender } = render(<NovaAIChatScreen onNavigate={mockNavigate} routeParams={{ profileId: 'p1' }} />);
    
    expect(await screen.findByText(/Radhe Radhe, Profile One Ji/)).toBeInTheDocument();
    
    // 2. Switch to second profile
    mockGetProfileById.mockResolvedValueOnce({ id: 'p2', name: 'Profile Two', birthDetails: { dob: '1990-01-01' } });
    
    rerender(<NovaAIChatScreen onNavigate={mockNavigate} routeParams={{ profileId: 'p2' }} />);
    
    expect(await screen.findByText(/Radhe Radhe, Profile Two Ji/)).toBeInTheDocument();
    
    // Ensure the greeting from the old profile is removed
    expect(screen.queryByText(/Profile One Ji/)).not.toBeInTheDocument();
  });

  it('real Kundli preview receives normalized payload and dummy generateKundli is never called', async () => {
    mockGetProfileById.mockResolvedValue({ id: 'p1', name: 'PreviewUser' });
    vi.mocked(AstrologyApi.getKundli).mockResolvedValue({ lagna: 'Aries' } as any);
    
    render(<NovaAIChatScreen onNavigate={mockNavigate} routeParams={{ profileId: 'p1' }} />);
    
    // Wait for the kundli loading steps to complete and chart to appear
    await waitFor(() => {
      expect(AstrologyApi.getKundli).toHaveBeenCalledWith('p1');
    }, { timeout: 10000 });

    const preview = await screen.findByTestId('kundli-preview', {}, { timeout: 10000 });
    expect(preview).toBeInTheDocument();
    
    // Should NOT call the legacy local dummy generator
    expect(kundliService.generateKundli).not.toHaveBeenCalled();
  }, 15000);
});
