import "dotenv/config";
import { GoogleGenAI } from '@google/genai';

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const models = await ai.models.list();
    for await (const model of models) {
      console.log(model.name);
    }
  } catch (error: any) {
    console.error("Error:", error?.message || error);
  }
}
test();
