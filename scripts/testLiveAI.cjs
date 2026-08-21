require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function test() {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: 'You are a helpful assistant.', temperature: 0.7 },
      history: []
    });
    const response = await chat.sendMessage({ message: [{ text: 'areh pandit ji mein tho technical work akrta hun apye zaamin sey jude kaam kuy sugest kar rhe hey' }] });
    console.log("SUCCESS:", response.text);
  } catch (err) {
    console.error("ERROR:", err.message);
    console.error("STATUS:", err.status);
  }
}
test();
