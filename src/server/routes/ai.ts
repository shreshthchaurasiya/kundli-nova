import express from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

import { NavamshaProvider } from '../providers/navamshaProvider';
import { KundliCalculationService } from '../services/kundliCalculationService';
import { NovaAIContextService } from '../services/ai/NovaAIContextService';
import { NovaAIPromptBuilder } from '../services/ai/NovaAIPromptBuilder';
import { NovaAIConversationMemory } from '../types/novaAiContext';

export interface AiRouterConfig {
  geminiApiKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export function createAiRouter(config: AiRouterConfig) {
  const router = express.Router();
  const ai = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;
  const authClient = config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  // AI Services
  const provider = new NavamshaProvider({ timeoutMs: 15000 });
  const kundliService = new KundliCalculationService(provider);
  const contextService = new NovaAIContextService(kundliService);
  const promptBuilder = new NovaAIPromptBuilder();

  const protectedAiPaths = ['/api/ai', '/api/chat', '/api/explain'];

  router.use(protectedAiPaths, express.json({ limit: '5mb' }));
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
    const profileId = req.body?.profileId || req.body?.userProfile?.id;
    const profileBId = req.body?.profileBId;
    const userId = res.locals.user.id;
    
    const safeMessages = messages
      .filter((message: any) => ['user', 'nova'].includes(message?.sender) && (typeof message?.text === 'string' || message?.attachmentUrl))
      .map((message: any) => ({
        sender: message.sender,
        text: (message.text || '').trim().slice(0, 2000),
        attachmentUrl: message.attachmentUrl || null
      }))
      .filter((message: any) => message.text || message.attachmentUrl)
      .slice(-20);
      
    const firstUserMessage = safeMessages.findIndex((message: any) => message.sender === 'user');

    if (firstUserMessage === -1) {
      return res.status(400).json({ code: 'INVALID_REQUEST', error: 'Please enter a message for Nova AI.' });
    }

    const memory: NovaAIConversationMemory = {
      sessionId: req.body?.sessionId || `session-${Date.now()}`,
      topic: req.body?.topic || 'General Guidance',
      recentMessages: safeMessages.slice(firstUserMessage).map((m: any) => ({
        sender: m.sender,
        text: m.text,
        time: new Date().toISOString()
      }))
    };

    let systemInstruction = NovaAIPromptBuilder.SYSTEM_INSTRUCTION;

    if (profileId) {
      try {
        const compatibilityContext = req.body?.compatibilityContext;
        const context = await contextService.loadContext(userId, profileId, memory, profileBId, compatibilityContext);
        const dynamicContext = promptBuilder.buildPromptContext(context);
        systemInstruction = `${NovaAIPromptBuilder.SYSTEM_INSTRUCTION}\n\n${dynamicContext}`;
      } catch (error) {
        console.error('[Nova AI] Error loading context:', error);
        systemInstruction = `${NovaAIPromptBuilder.SYSTEM_INSTRUCTION}\n\nAstrology Context: UNAVAILABLE`;
      }
    } else {
      systemInstruction = `${NovaAIPromptBuilder.SYSTEM_INSTRUCTION}\n\nAstrology Context: UNAVAILABLE`;
    }

    const conversation = await Promise.all(safeMessages.slice(firstUserMessage).map(async (message: any) => {
      const parts: any[] = [];
      if (message.attachmentUrl) {
        try {
          const imgRes = await fetch(message.attachmentUrl);
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
            parts.push({
              inlineData: { data: base64, mimeType }
            });
          }
        } catch (e) {
          console.error('[Nova AI] Failed to fetch attachment:', e);
        }
      }
      
      parts.push({ text: message.text || "Please analyze this image." });

      return {
        role: message.sender === 'user' ? 'user' : 'model',
        parts,
      };
    }));

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: conversation,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      let texts: string[];
      let rawText = response.text || '[]';
      
      // Clean up markdown formatting (e.g., ```json\n...\n```)
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        rawText = jsonMatch[1];
      }

      try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
          texts = parsed
            .filter(item => item !== null && item !== undefined)
            .map(item => String(item).trim())
            .filter(Boolean)
            .map(item => item.slice(0, 800)) // reasonable max length per bubble
            .slice(0, 4); // max 4 bubbles
        } else {
          texts = [String(parsed).trim().slice(0, 2000)];
        }
      } catch {
        // Fallback: safely render the plain response as one message, stripping markdown fences if any remain
        const cleanText = (response.text || '').replace(/```(?:json)?|```/g, '').trim();
        texts = cleanText ? [cleanText.slice(0, 2000)] : [];
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
