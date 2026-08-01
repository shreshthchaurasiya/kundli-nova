import express from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

import { NavamshaProvider } from '../providers/navamshaProvider';
import { KundliCalculationService } from '../services/kundliCalculationService';
import { NovaAIContextService } from '../services/ai/NovaAIContextService';
import { NovaAIPromptBuilder } from '../services/ai/NovaAIPromptBuilder';
import { NovaAIToolRegistry } from '../services/ai/NovaAIToolRegistry';
import { NovaAIConversationMemory } from '../types/novaAiContext';
import { AIUsageService } from '../services/aiUsageService';
import { supabaseAdmin } from '../config/supabase';

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
  const toolRegistry = new NovaAIToolRegistry(kundliService);

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
    
    try {
      await AIUsageService.checkAndIncrementUsage(userId);
    } catch (err: any) {
      if (err.statusCode === 403) {
        return res.status(403).json({ code: 'USAGE_LIMIT_EXCEEDED', error: err.message });
      }
      return res.status(500).json({ code: 'INTERNAL_ERROR', error: 'Error checking AI usage limits.' });
    }
    
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

    // Fetch active profile details for dynamic context
    let activeProfileContext = null;
    console.log(`[Nova AI] /api/chat called by userId: ${userId}, profileId: ${profileId}`);
    if (profileId) {
      try {
        const { data: profileData, error } = await supabaseAdmin
          .from('kundli_profiles')
          .select('*')
          .eq('id', profileId)
          .eq('owner_id', userId)
          .single();
        console.log(`[Nova AI] Fetched profileData for ${profileId}:`, profileData ? profileData.name : 'null', 'Error:', error);
        if (profileData) {
          activeProfileContext = profileData;
        }
      } catch (e) {
        console.error('[Nova AI] Failed to fetch active profile context:', e);
      }
    } else {
      console.log(`[Nova AI] No profileId provided in request body!`);
    }

    const baseSystemInstruction = promptBuilder.buildSystemInstruction(activeProfileContext);
    
    // Fetch Long-Term Memory
    let memoryContext = '';
    try {
      const { data: pastSessions } = await supabaseAdmin
        .from('ai_chat_sessions')
        .select('summary, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (pastSessions && pastSessions.length > 0) {
        memoryContext = '\n\nPAST CONVERSATION MEMORY (Use this to remember user details):\n' + 
          pastSessions.map(s => `- ${s.summary}`).join('\n');
      }
    } catch (e) {
      console.error('[Nova AI] Failed to fetch memory', e);
    }
    
    const systemInstruction = baseSystemInstruction + memoryContext;

    const conversation: any[] = await Promise.all(safeMessages.slice(firstUserMessage).map(async (message: any) => {
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
      // Try primary model first, fallback to lite if quota exhausted
      const PRIMARY_MODEL = 'gemini-2.5-flash';
      const FALLBACK_MODEL = 'gemini-flash-lite-latest';
      
      const createChat = (model: string) => ai.chats.create({
        model,
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: [{ functionDeclarations: toolRegistry.getToolDeclarations() }],
        },
        history: conversation.slice(0, -1),
      });

      let chat = createChat(PRIMARY_MODEL);


      const lastUserMessage = conversation[conversation.length - 1];
      let response: any;
      try {
        response = await chat.sendMessage({ message: lastUserMessage.parts });
      } catch (quotaErr: any) {
        if (quotaErr?.status === 429) {
          console.warn('[Nova AI] Primary model quota exhausted, falling back to lite model');
          chat = createChat(FALLBACK_MODEL);
          response = await chat.sendMessage({ message: lastUserMessage.parts });
        } else {
          throw quotaErr;
        }
      }

      // Function Calling Loop (max 3 calls to prevent infinite loops)
      let callsCount = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && callsCount < 3) {
        callsCount++;
        const functionResponses = await Promise.all(response.functionCalls.map(async (call) => {
          const result = await toolRegistry.executeTool(call.name, call.args, userId);
          return {
            functionResponse: {
              name: call.name,
              response: typeof result === 'object' ? result : { result },
            },
          };
        }));
        
        response = await chat.sendMessage({ message: functionResponses });
      }

      let texts: string[];
      let suggestions: string[] = [];
      let rawText = response.text || '';
      
      // Extract SUGGESTED_QUESTIONS if present
      const suggestionsMatch = rawText.match(/SUGGESTED_QUESTIONS:\s*(\[[^\]]+\])/);
      if (suggestionsMatch && suggestionsMatch[1]) {
        try {
          suggestions = JSON.parse(suggestionsMatch[1]);
          rawText = rawText.replace(suggestionsMatch[0], '').trim();
        } catch (e) {
          console.error('[Nova AI] Failed to parse suggested questions:', e);
        }
      }

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
            .map(item => item.slice(0, 2000))
            .slice(0, 4);
        } else {
          texts = [String(parsed).trim().slice(0, 2000)];
        }
      } catch {
        const cleanText = rawText.replace(/```(?:json)?|```/g, '').trim();
        texts = cleanText ? [cleanText.slice(0, 2000)] : [];
      }

      if (!texts.length) throw new Error('Gemini returned an empty response');
      
      // Fire-and-forget background memory save
      const sessionId = req.body?.sessionId || `session-${userId}`;
      const memoryPrompt = `Summarize this conversation in 1-2 short sentences. Focus only on the user's current situation, goals, or problems. \nUser: ${lastUserMessage.parts[0].text}\nNova: ${texts.join(' ')}`;
      
      ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: memoryPrompt,
        config: { systemInstruction: 'You are a summarizer. Keep it extremely brief.' }
      }).then(async (summaryRes) => {
        const summary = summaryRes.text?.trim();
        if (summary) {
          try {
            const { data: existing } = await supabaseAdmin
              .from('ai_chat_sessions')
              .select('id')
              .eq('session_id', sessionId)
              .eq('user_id', userId)
              .maybeSingle();
              
            if (existing) {
              await supabaseAdmin.from('ai_chat_sessions').update({ summary, updated_at: new Date().toISOString() }).eq('id', existing.id);
            } else {
              await supabaseAdmin.from('ai_chat_sessions').insert({ user_id: userId, session_id: sessionId, summary });
            }
          } catch (dbErr) {
            console.error('[Nova AI] Failed to save memory summary:', dbErr);
          }
        }
      }).catch(err => console.error('[Nova AI] Failed to save memory summary:', err));

      return res.json({ texts, suggestions });
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
    
    const userId = res.locals.user.id;
    try {
      await AIUsageService.checkAndIncrementUsage(userId);
    } catch (err: any) {
      if (err.statusCode === 403) {
        return res.status(403).json({ code: 'USAGE_LIMIT_EXCEEDED', error: err.message });
      }
      return res.status(500).json({ code: 'INTERNAL_ERROR', error: 'Error checking AI usage limits.' });
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
