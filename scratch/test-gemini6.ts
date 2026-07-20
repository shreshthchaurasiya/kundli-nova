import "dotenv/config";
import { GoogleGenAI } from '@google/genai';

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: "Hello Nova AI" }] }],
    });
    console.log("Success 1.5-flash text:", response.text);
  } catch (error: any) {
    console.error("Error details:", error?.message || error, JSON.stringify(error, null, 2));
  }
}
test();
