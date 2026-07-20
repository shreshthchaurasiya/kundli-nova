import "dotenv/config";
import { GoogleGenAI } from '@google/genai';

async function test() {
  console.log("Key starting with:", process.env.GEMINI_API_KEY?.substring(0, 10));
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: "Hello, this is a test.",
    });
    console.log("Success:", response.text);
  } catch (error: any) {
    console.error("Error:", error?.message || error);
  }
}
test();
