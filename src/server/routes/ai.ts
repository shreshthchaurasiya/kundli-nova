import express from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export interface AiRouterConfig {
  geminiApiKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

const CHAT_SYSTEM_INSTRUCTION = `You are a professional, calm, respectful Vedic astrologer named Acharya Dev Sharma working in the Kundli Nova app.
Use simple, supportive Hinglish. Keep each message short and practical. Do not make medical, legal, or guaranteed financial claims.
Respond only with a JSON array containing 2 to 4 short strings. Each string is a separate chat bubble. End with one relevant follow-up question.`;

export function createAiRouter(config: AiRouterConfig) {
  const router = express.Router();
  const ai = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;
  const authClient = config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  // The router is mounted at the Vite/Express app root, so middleware must
  // only run for Nova AI endpoints. Otherwise it intercepts the React SPA
  // (including "/") and returns UNAUTHORIZED before Vite can serve index.html.
  const protectedAiPaths = ['/api/ai', '/api/chat', '/api/explain'];

  router.use(protectedAiPaths, express.json({ limit: '256kb' }));
  router.use(protectedAiPaths, rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  router.use(protectedAiPaths, async (req, res, next) => {
    if (!authClient) {
      return res.status(503).json({ code: 'AUTH_NOT_CONFIGURED', error: 'AI authentication is not configured.' });
    }

    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) {
      return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Please sign in to use Nova AI.' });
    }

    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Your session has expired. Please sign in again.' });
    }

    res.locals.user = user;
    next();
  });

  router.get('/api/ai/status', (_req, res) => {
    res.json({ configured: Boolean(ai), model: 'gemini-flash-lite-latest' });
  });

  router.post('/api/chat', async (req, res) => {
    if (!ai) {
      return res.status(503).json({ code: 'AI_NOT_CONFIGURED', error: 'Gemini API key is not configured on the server.' });
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const userProfile = req.body?.userProfile ?? {};
    const safeMessages = messages
      .filter((message: any) => typeof message?.text === 'string' && ['user', 'nova'].includes(message?.sender))
      .map((message: any) => ({ sender: message.sender, text: message.text.trim().slice(0, 2000) }))
      .filter((message: any) => message.text)
      .slice(-20);
    const firstUserMessage = safeMessages.findIndex((message: any) => message.sender === 'user');

    if (firstUserMessage === -1) {
      return res.status(400).json({ code: 'INVALID_REQUEST', error: 'Please enter a message for Nova AI.' });
    }

    const conversation = safeMessages.slice(firstUserMessage).map((message: any) => ({
      role: message.sender === 'user' ? 'user' : 'model',
      parts: [{ text: message.text }],
    }));
    const profileContext = [
      userProfile?.name && `Name: ${String(userProfile.name).slice(0, 100)}`,
      userProfile?.gender && `Gender: ${String(userProfile.gender).slice(0, 30)}`,
      userProfile?.dob && `DOB: ${String(userProfile.dob).slice(0, 20)}`,
      userProfile?.tob && `TOB: ${String(userProfile.tob).slice(0, 20)}`,
      userProfile?.city && `Birth place: ${String(userProfile.city).slice(0, 100)}`,
    ].filter(Boolean).join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: conversation,
        config: {
          systemInstruction: `${CHAT_SYSTEM_INSTRUCTION}\n\nUser profile:\n${profileContext || 'Profile unavailable'}`,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      let texts: string[];
      try {
        const parsed = JSON.parse(response.text || '[]');
        texts = Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(0, 4) : [String(parsed)];
      } catch {
        texts = response.text ? [response.text] : [];
      }

      if (!texts.length) throw new Error('Gemini returned an empty response');
      return res.json({ texts });
    } catch (error: any) {
      console.error('[Nova AI] Gemini request failed:', error?.message || 'Unknown provider error');
      return res.status(502).json({ code: 'AI_PROVIDER_ERROR', error: 'Nova AI is temporarily unavailable. Please try again.' });
    }
  });

  router.post('/api/explain', async (req, res) => {
    if (!ai) {
      return res.status(503).json({ code: 'AI_NOT_CONFIGURED', error: 'Gemini API key is not configured on the server.' });
    }

    const { section, data, userProfile } = req.body ?? {};
    if (!['charts', 'planets', 'dasha'].includes(section)) {
      return res.status(400).json({ code: 'INVALID_REQUEST', error: 'Unknown Kundli section.' });
    }

    let sectionDescription = '';
    if (section === 'charts') {
      sectionDescription = `Lagna: ${data?.lagna}, Moon Sign: ${data?.moonSign}, Nakshatra: ${data?.nakshatra}.`;
    } else if (section === 'planets') {
      sectionDescription = `Planetary positions: ${JSON.stringify(data?.planetaryPositions ?? []).slice(0, 6000)}`;
    } else {
      sectionDescription = `Mahadasha: ${data?.mahadasha}, Antardasha: ${data?.antardasha}.`;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: `Explain this Kundli section in simple Hinglish, in 3 to 4 short lines (maximum 80 words). Give positive, practical guidance without guarantees.\nSection: ${section}\nDetails: ${sectionDescription}\nUser: ${String(userProfile?.name || 'User').slice(0, 100)}, DOB: ${String(userProfile?.dob || 'Unknown').slice(0, 20)}`,
        config: {
          systemInstruction: 'You are a friendly Vedic astrology guide named Acharya Dev Sharma. Never make guaranteed or harmful claims.',
          temperature: 0.7,
        },
      });

      return res.json({ explanation: response.text });
    } catch (error: any) {
      console.error('[Nova AI] Explain request failed:', error?.message || 'Unknown provider error');
      return res.status(502).json({ code: 'AI_PROVIDER_ERROR', error: 'Nova AI is temporarily unavailable. Please try again.' });
    }
  });

  return router;
}
