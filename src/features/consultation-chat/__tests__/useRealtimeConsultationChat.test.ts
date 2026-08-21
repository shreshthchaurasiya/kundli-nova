import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeConsultationChat } from '../hooks/useRealtimeConsultationChat';
import { supabase } from '../../../lib/supabase';
import { ApiChatRepository } from '../../../repositories/api/apiChatRepository';

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { status: 'ACTIVE' }, error: null })
        })
      })
    })
  },
}));

vi.mock('../../../repositories/api/apiChatRepository');

describe('useRealtimeConsultationChat', () => {
  let mockChannel: any;
  let onEvents: Record<string, Function> = {};
  let subscribeCallback: Function | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    onEvents = {};
    subscribeCallback = undefined;

    mockChannel = {
      on: vi.fn().mockImplementation((event, filter, callback) => {
        onEvents[filter.table] = callback; // rough mock
        return mockChannel;
      }),
      subscribe: vi.fn().mockImplementation((callback) => {
        subscribeCallback = callback;
        return mockChannel;
      }),
      send: vi.fn(),
    };

    (supabase.channel as any).mockReturnValue(mockChannel);
  });

  it('initial SUBSCRIBED causes exactly 1 GET and reconnect causes 1 GET', async () => {
    const getMessagesMock = vi.fn().mockResolvedValue([]);
    (ApiChatRepository.prototype.getMessages as any).mockImplementation(getMessagesMock);

    renderHook(() => useRealtimeConsultationChat('sess1'));

    // Wait for the hook to set up
    await Promise.resolve();

    // Initial fetch should have happened when hook mounted
    expect(getMessagesMock).toHaveBeenCalledTimes(1);

    // Initial subscription
    await act(async () => {
      subscribeCallback?.('SUBSCRIBED');
      await Promise.resolve(); // allow fetchMessages to complete
    });

    // Should NOT trigger another GET because it's the first time
    expect(getMessagesMock).toHaveBeenCalledTimes(1);

    // Disconnect
    await act(async () => {
      subscribeCallback?.('CHANNEL_ERROR');
      await Promise.resolve();
    });

    // Reconnect
    await act(async () => {
      subscribeCallback?.('SUBSCRIBED');
      await Promise.resolve(); // allow fetchMessages to complete
    });

    // Should trigger exactly one more GET
    expect(getMessagesMock).toHaveBeenCalledTimes(2);

    // Another SUBSCRIBED without disconnect
    await act(async () => {
      subscribeCallback?.('SUBSCRIBED');
      await Promise.resolve();
    });

    // Should NOT trigger another GET
    expect(getMessagesMock).toHaveBeenCalledTimes(2);
  });

  it('deduplicates messages gracefully and race orders', async () => {
    const getMessagesMock = vi.fn().mockResolvedValue([]);
    (ApiChatRepository.prototype.getMessages as any).mockImplementation(getMessagesMock);
    const sendMessageMock = vi.fn().mockResolvedValue({
      id: 'db1',
      clientMessageId: 'c1',
      sender: 'user',
      text: 'hello',
      time: '2026-07-21T00:00:00Z',
      type: 'text'
    });
    (ApiChatRepository.prototype.sendMessage as any).mockImplementation(sendMessageMock);

    const { result } = renderHook(() => useRealtimeConsultationChat('sess1'));

    // Post result first
    await act(async () => {
      await result.current.send('hello'); // Generates a clientMessageId and sets it optimistically
    });

    expect(result.current.messages.length).toBe(1);
    const cId = result.current.messages[0].clientMessageId;

    // Realtime INSERT second
    await act(async () => {
      onEvents['consultation_messages']({
        new: {
          id: 'db1',
          client_message_id: cId,
          session_id: 'sess1',
          sender: 'user',
          text: 'hello',
          created_at: '2026-07-21T00:00:00Z'
        }
      });
      await Promise.resolve();
    });

    // Still 1 message
    expect(result.current.messages.length).toBe(1);

    // Two messages with null clientMessageIds are NOT deduplicated if DB ids differ
    await act(async () => {
      onEvents['consultation_messages']({
        new: { id: 'db2', client_message_id: null, session_id: 'sess1', sender: 'astrologer', text: 'hi', created_at: '2026-07-21T00:00:01Z' }
      });
      onEvents['consultation_messages']({
        new: { id: 'db3', client_message_id: null, session_id: 'sess1', sender: 'astrologer', text: 'there', created_at: '2026-07-21T00:00:02Z' }
      });
      await Promise.resolve();
    });

    expect(result.current.messages.length).toBe(3); // The user msg + two astrologer msgs
  });
});
