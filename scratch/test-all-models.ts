import "dotenv/config";
import { GoogleGenAI } from '@google/genai';

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelsToTest = [
    'gemini-flash-lite-latest',
    'gemma-4-26b-a4b-it',
    'gemini-3.1-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
  ];
  
  for (const model of modelsToTest) {
    console.log(`Testing ${model}...`);
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: "Hello" }] }],
      });
      console.log(`SUCCESS [${model}]:`, response.text);
      break; // Found a working one!
    } catch (error: any) {
      console.error(`FAILED [${model}]:`, error?.message || error);
    }
  }
}
test();
