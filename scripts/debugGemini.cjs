require('dotenv').config();
const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function test() {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a helpful assistant.",
        temperature: 0.7,
        tools: [{
          functionDeclarations: [
            {
              name: 'get_daily_insights',
              description: 'Gets insights',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  profileId: { type: Type.STRING, description: 'ID' }
                },
                required: ['profileId']
              }
            }
          ]
        }]
      },
      history: []
    });

    console.log("Chat created, sending message...");
    const response = await chat.sendMessage({ message: [{ text: "Hello" }] });
    console.log("Response:", response.text);
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  }
}

test();
