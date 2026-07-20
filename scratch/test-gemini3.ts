import "dotenv/config";
import { GoogleGenAI } from '@google/genai';

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: "Hello Nova AI" }] }],
      config: {
        systemInstruction: "You are a professional astrologer.",
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });
    console.log("Success 2.5 text:", response.text);
  } catch (error: any) {
    console.error("Error details:", error?.message || error, JSON.stringify(error, null, 2));
  }
}
test();
