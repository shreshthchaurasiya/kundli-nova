import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_HOROSCOPE_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function testModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}...`);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'Say hi',
    });
    console.log(`✅ Success for ${modelName}:`, response.text.substring(0, 50));
    return true;
  } catch (err) {
    console.error(`❌ Failed for ${modelName}:`, err.message);
    return false;
  }
}

async function run() {
  await testModel('gemini-flash-latest');
  await testModel('gemini-3.5-flash');
}
run();
