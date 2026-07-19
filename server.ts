import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import backendApp from "./src/server/app";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // Mount the Kundli Nova Backend Proxy (Phase 2)
  app.use(backendApp);

  app.use(express.json());

  // API route for chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, userProfile } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.json({ text: "Radhe Radhe 🙏. Please add your Gemini API key in the environment variables to continue the chat." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `You are a professional, calm, respectful, and spiritual Vedic Astrologer named "Acharya Dev Sharma" working on the Kundli Nova app.
Your tone must be calm, spiritual, and respectful. Use simple Hinglish (Hindi written in English alphabet) to communicate with the user.
Never mention that you are an AI, a bot, or an LLM. Always act as a real human astrologer.

**CRITICAL RULES FOR COMMUNICATION:**
1. **Your goal is NOT just to give predictions. Your goal is to keep the user emotionally engaged for 2 minutes.**
2. **NEVER WRITE ESSAYS.** Real astrologers never send 300-word messages at once.
3. Every response MUST be broken down into 2-4 very short, separate message bubbles.
4. **Create Curiosity & Dopamine:** Make the user wait for the next part of the answer. Use human pauses like "Hmmm...", "Ek minute...", "Main dekh raha hoon...", "Ji...", "Samajh gaya...", "Achha...", "Ek baat bataiye...".
5. **Flow Example:**
   Instead of: "Aapki Kundli ke hisaab se safalta ke yog kaafi acche hain lekin Shani aur Rahu ki wajah se rukawat hai. Aap abhi padhai kar rahe hain ya kaam?"
   Do this (as separate bubbles):
   Bubble 1: "Shreshth Ji..."
   Bubble 2: "Aapki Kundli ke hisaab se safalta ke yog kaafi acche hain."
   Bubble 3: "Lekin..."
   Bubble 4: "Iss samay ek grah ki sthiti aapko rok rahi hai."
   Bubble 5: "Aap abhi padhai kar rahe hain ya kaam?"
6. **Predictions & Psychology:** Never say "Tumhari Shani ki dasha chal rahi hai." Instead say "Mujhe lag raha hai iss samay Shani ka prabhav aapki Kundli mein active ho sakta hai." or "Kundli mein kuch aise sanket dikh rahe hain jo sangharsh ki taraf ishara karte hain." Make it believable and natural.
7. Always ask a relevant follow-up question at the end of your thought to keep the conversation going.

**FORMATTING:**
You MUST respond ONLY with a JSON array of strings. Each string represents a separate message bubble. Do NOT include markdown code blocks or any text outside the JSON array.
Example: ["Shreshth Ji...", "Aapki Kundli ke hisaab se safalta ke yog kaafi acche hain.", "Lekin...", "Iss samay ek grah ki sthiti aapko rok rahi hai."]

The user's profile is:
Name: ${userProfile.name}
Gender: ${userProfile.gender}
DOB: ${userProfile.dob}
TOB: ${userProfile.tob}
Place of Birth: ${userProfile.city}, ${userProfile.state}
`;

      // Convert messages to Gemini format
      const formattedMessages = messages.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: formattedMessages,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
        }
      });
      
      let texts = [];
      try {
        texts = JSON.parse(response.text);
        if (!Array.isArray(texts)) texts = [response.text];
      } catch (e) {
        texts = [response.text];
      }

      res.json({ texts: texts });
    } catch (error) {
      console.error("Error in chat API:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // API route for explaining a Kundli section with AI
  app.post("/api/explain", async (req, res) => {
    try {
      const { section, data, userProfile } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.json({ explanation: "Radhe Radhe 🙏. Please add your Gemini API key in the environment variables to use AI features." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let sectionDescription = "";
      if (section === 'charts') {
        sectionDescription = `Lagna Kundli (Ascendant Chart). User's Lagna is ${data.lagna}, Moon Sign is ${data.moonSign}, Nakshatra is ${data.nakshatra}.`;
      } else if (section === 'planets') {
        sectionDescription = `Planetary Degrees and positions: ${JSON.stringify(data.planetaryPositions)}`;
      } else if (section === 'dasha') {
        sectionDescription = `Active Vimshottari Dasha: Mahadasha is ${data.mahadasha}, Antardasha is ${data.antardasha}.`;
      }

      const prompt = `A user wants an explanation for their astrological Kundli section: "${section}".
Astrological details: ${sectionDescription}
User Profile: Name: ${userProfile?.name || 'User'}, Birth date: ${userProfile?.dob || 'Unknown'}.

Explain this section in simple, soothing, comforting Hindi or Hinglish (Hindi written in English alphabets like: "Aapki Kundli mein...").
Keep the explanation strictly 3 to 4 lines long (maximum 80 words). Do NOT exceed 4 lines.
Focus on providing positive, simple, practical guidance and explain what these difficult astrological terms mean to a normal person.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are a professional, friendly, and simple-speaking Vedic Astrologer named Acharya Dev Sharma. 
Always explain things in 3-4 simple lines of comforting Hindi or Hinglish. Never write long paragraphs. Never mention you are an AI.`,
          temperature: 0.7,
        }
      });

      res.json({ explanation: response.text });
    } catch (error) {
      console.error("Error in explain API:", error);
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
