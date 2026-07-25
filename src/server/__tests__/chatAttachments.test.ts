import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { supabaseAdmin } from '../config/supabase';

vi.mock('../config/supabase', () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis()
  };
  return {
    supabaseAdmin: {
      from: vi.fn(() => chainable),
      rpc: vi.fn()
    }
  };
});

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'user-123' };
    next();
  },
}));

describe('Chat Attachments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSessionId = '00000000-0000-0000-0000-000000000000';

  it('generates upload URL for supported MIME type (JPEG)', async () => {
    const mockStorageFrom = {
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'http://test-signed', token: 'tok', path: 'path' },
        error: null,
      }),
    };
    (supabaseAdmin.storage.from as any).mockReturnValue(mockStorageFrom);

    const mockDbFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { user_id: 'user-123', status: 'ACTIVE' },
        error: null,
      }),
    };
    (supabaseAdmin.from as any).mockReturnValue(mockDbFrom);

    const res = await request(app)
      .post(`/api/v1/consultations/${mockSessionId}/messages/upload-url`)
      .send({ mimeType: 'image/jpeg', sizeBytes: 1024 });

    expect(res.status).toBe(200);
    expect(res.body.data.signedUrl).toBe('http://test-signed');
    expect(mockStorageFrom.createSignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^consultations\/.*\.jpg$/),
      { upsert: false }
    );
  });

  it('rejects upload URL for oversized file', async () => {
    const mockDbFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { user_id: 'user-123', status: 'ACTIVE' },
        error: null,
      }),
    };
    (supabaseAdmin.from as any).mockReturnValue(mockDbFrom);

    const res = await request(app)
      .post(`/api/v1/consultations/${mockSessionId}/messages/upload-url`)
      .send({ mimeType: 'image/jpeg', sizeBytes: 10 * 1024 * 1024 }); // 10MB

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('exceeds the 5MB limit');
  });

  it('rejects finalize for unsupported actual storage MIME type', async () => {
    const mockStorageFrom = {
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'test.jpg', metadata: { mimetype: 'application/pdf', size: 1024 } }],
        error: null,
      }),
    };
    (supabaseAdmin.storage.from as any).mockReturnValue(mockStorageFrom);

    const mockDbFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
      single: vi.fn().mockResolvedValue({
        data: { user_id: 'user-123', status: 'ACTIVE' },
        error: null,
      }),
    };
    (supabaseAdmin.from as any).mockReturnValue(mockDbFrom);

    const res = await request(app)
      .post(`/api/v1/consultations/${mockSessionId}/messages`)
      .send({
        client_message_id: '11111111-1111-4111-a111-111111111111',
        message_type: 'image',
        attachment_url: `consultations/${mockSessionId}/test.jpg`
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Actual storage object MIME type is unsupported');
  });

  it('idempotent finalize does not delete object and returns existing', async () => {
    const mockDbSelect = vi.fn().mockReturnThis();
    const mockDbEq = vi.fn().mockReturnThis();
    const mockDbNeq = vi.fn().mockReturnThis();
    const mockDbLimit = vi.fn().mockReturnThis();
    
    // First, requireParticipant check
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: { user_id: 'user-123', status: 'ACTIVE' },
      error: null,
    });

    // Check existing binding for attachment
    mockDbLimit.mockResolvedValueOnce({ data: [] });

    const mockInsert = vi.fn().mockReturnThis();
    // Insert fails with duplicate error
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '23505' },
    });
    // Fallback lookup
    mockSingle.mockResolvedValueOnce({
      data: { id: 'msg-123', client_message_id: 'c-123' },
      error: null,
    });

    const mockDbFrom = {
      select: mockDbSelect,
      eq: mockDbEq,
      neq: mockDbNeq,
      limit: mockDbLimit,
      single: mockSingle,
      insert: mockInsert,
    };
    (supabaseAdmin.from as any).mockReturnValue(mockDbFrom);

    const mockStorageFrom = {
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'test.jpg', metadata: { mimetype: 'image/jpeg', size: 1024 } }],
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.storage.from as any).mockReturnValue(mockStorageFrom);

    const res = await request(app)
      .post(`/api/v1/consultations/${mockSessionId}/messages`)
      .send({
        client_message_id: '11111111-1111-4111-a111-111111111111',
        message_type: 'image',
        attachment_url: `consultations/${mockSessionId}/test.jpg`
      });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('msg-123');
    // Ensure orphan cleanup wasn't called
    expect(mockStorageFrom.remove).not.toHaveBeenCalled();
  });

  it('runs orphan cleanup if finalize genuinely fails and object is unreferenced', async () => {
    const mockDbSelect = vi.fn().mockReturnThis();
    const mockDbEq = vi.fn().mockReturnThis();
    const mockDbNeq = vi.fn().mockReturnThis();
    const mockDbLimit = vi.fn().mockReturnThis();
    
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: { user_id: 'user-123', status: 'ACTIVE' },
      error: null,
    });

    mockDbLimit.mockResolvedValueOnce({ data: [] }); // No existing binding

    const mockInsert = vi.fn().mockReturnThis();
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'OTHER_ERROR' }, // Not duplicate
    });

    // Reference check during cleanup -> no references
    mockDbLimit.mockResolvedValueOnce({ data: [] });

    const mockDbFrom = {
      select: mockDbSelect,
      eq: mockDbEq,
      neq: mockDbNeq,
      limit: mockDbLimit,
      single: mockSingle,
      insert: mockInsert,
    };
    (supabaseAdmin.from as any).mockReturnValue(mockDbFrom);

    const mockStorageFrom = {
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'test.jpg', metadata: { mimetype: 'image/jpeg', size: 1024 } }],
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.storage.from as any).mockReturnValue(mockStorageFrom);

    const res = await request(app)
      .post(`/api/v1/consultations/${mockSessionId}/messages`)
      .send({
        client_message_id: '11111111-1111-4111-a111-111111111111',
        message_type: 'image',
        attachment_url: `consultations/${mockSessionId}/test.jpg`
      });

    expect(res.status).toBe(500); // Because it genuinely failed
    // Wait for the async cleanup to run
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockStorageFrom.remove).toHaveBeenCalledWith([`consultations/${mockSessionId}/test.jpg`]);
  });
});
