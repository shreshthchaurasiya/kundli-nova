import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import backendApp from "./src/server/app";
import { createAiRouter } from "./src/server/routes/ai";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // AI routes must be mounted before the backend's catch-all 404 handler.
  app.use(createAiRouter({
    geminiApiKey: process.env.GEMINI_API_KEY,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
  }));

  // Mount the Kundli Nova Backend Proxy (Phase 2)
  app.use(backendApp);

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
