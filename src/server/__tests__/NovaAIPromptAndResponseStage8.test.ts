import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAiRouter } from '../routes/ai';
import { NovaAIPromptBuilder } from '../services/ai/NovaAIPromptBuilder';
import { GoogleGenAI } from '@google/genai';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent
      };
    }
  };
});

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn().mockImplementation(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
      }
    }))
  };
});

// Mock ContextService so we can simulate cache hit/miss reliably
vi.mock('../services/ai/NovaAIContextService', () => {
  return {
    NovaAIContextService: class {
      loadContext = vi.fn().mockResolvedValue({
        user: { id: 'user-1' },
        selectedProfile: { name: 'Test User' },
        astrology: {
          natalChart: { 
            ascendant: { sign: 'Aries', degree: 15 },
            moonSign: 'Taurus',
            sunSign: 'Leo',
            nakshatra: 'Krittika',
            pada: 1,
            planets: []
          }
        }
      });
    }
  };
});

describe('Stage 8.3 - Nova AI Prompt and Structured Response Verification', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    // Bypass rate limiting by trusting proxy or mocking rateLimit
    const router = createAiRouter({
      geminiApiKey: 'test-key',
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key'
    });
    app.use(router);
  });

  it('persona consistency: prompt explicitly names the assistant as Nova AI', () => {
    expect(NovaAIPromptBuilder.SYSTEM_INSTRUCTION).toContain('You are Nova AI');
    expect(NovaAIPromptBuilder.SYSTEM_INSTRUCTION).toContain('intelligent astrology assistant');
  });

  it('greeting rule: prompt instructs to use validated profile name', () => {
    expect(NovaAIPromptBuilder.SYSTEM_INSTRUCTION).toContain('Radhe Radhe [User Name] ji');
    expect(NovaAIPromptBuilder.SYSTEM_INSTRUCTION).toContain('Name from the User Profile');
  });

  it('follow-up rule: prompt restricts unnecessary questions', () => {
    expect(NovaAIPromptBuilder.SYSTEM_INSTRUCTION).toContain('Do not ask unnecessary questions');
  });

  it('astrology rule: prompt prohibits recalculation and fabrication', () => {
    expect(NovaAIPromptBuilder.SYSTEM_INSTRUCTION).toContain('NEVER recalculate planetary positions');
    expect(NovaAIPromptBuilder.SYSTEM_INSTRUCTION).toContain('Do not fabricate it');
  });

  it('correctly extracts and parses JSON wrapped in markdown fences', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n["First bubble", "Second bubble"]\n```'
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer test-token')
      .send({
        messages: [{ sender: 'user', text: 'Hello' }],
        userProfile: { id: 'p1' }
      });

    expect(res.status).toBe(200);
    expect(res.body.texts).toEqual(['First bubble', 'Second bubble']);
  });

  it('handles invalid JSON by safely returning raw string as single bubble (minus markdown)', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n[This is not JSON]\n```\nHere is some text.'
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer test-token')
      .send({
        messages: [{ sender: 'user', text: 'Hello' }],
        userProfile: { id: 'p1' }
      });

    expect(res.status).toBe(200);
    // Strips ```json and ```
    expect(res.body.texts[0]).toContain('[This is not JSON]');
    expect(res.body.texts[0]).toContain('Here is some text.');
    expect(res.body.texts.length).toBe(1);
  });

  it('enforces maximum 4 bubbles and truncates extremely long strings', async () => {
    const longString = 'A'.repeat(3000);
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([longString, 'B', 'C', 'D', 'E'])
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer test-token')
      .send({
        messages: [{ sender: 'user', text: 'Hello' }],
        userProfile: { id: 'p1' }
      });

    expect(res.status).toBe(200);
    expect(res.body.texts.length).toBe(4); // 'E' is dropped
    expect(res.body.texts[0].length).toBe(800); // Truncated to reasonable length
  });
  
  it('filters empty strings out of JSON array', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(['Valid', '', '  ', null, 'Also valid'])
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer test-token')
      .send({
        messages: [{ sender: 'user', text: 'Hello' }],
        userProfile: { id: 'p1' }
      });

    expect(res.status).toBe(200);
    expect(res.body.texts).toEqual(['Valid', 'Also valid']);
  });
  
  it('gracefully handles missing texts / empty model response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: ''
    });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer test-token')
      .send({
        messages: [{ sender: 'user', text: 'Hello' }],
        userProfile: { id: 'p1' }
      });

    // We configured it to throw if texts array is empty. The error handler catches it and returns 502
    expect(res.status).toBe(502);
    expect(res.body.error).toContain('temporarily unavailable');
  });
});
