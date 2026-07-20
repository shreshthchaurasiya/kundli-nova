import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import express from 'express';
import { createAiRouter } from './src/server/routes/ai';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'kundli-nova-ai-api',
        configureServer(server) {
          // Keep GEMINI_API_KEY server-side while supporting the user's
          // standalone `npx vite` development workflow.
          const aiApp = express();
          aiApp.use(createAiRouter({
            geminiApiKey: env.GEMINI_API_KEY,
            supabaseUrl: env.VITE_SUPABASE_URL,
            supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
          }));
          server.middlewares.use(aiApp);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // The React dev server runs on :5173 while the secure Express API runs
      // on :3000. Keep API calls same-origin in the browser and proxy them in
      // development so profile saves, wallet, and consultation flows work.
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
