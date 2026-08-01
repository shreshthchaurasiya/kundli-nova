require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
async function run() {
  const models = await ai.models.list();
  for await (const m of models) {
    console.log(m.name);
  }
}
run();
