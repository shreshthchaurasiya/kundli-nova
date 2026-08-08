import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import express from 'express';
import { createAiRouter } from './src/server/routes/ai';

import { VitePWA } from 'vite-plugin-pwa';

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
      {
        name: 'kundli-nova-secure-api',
        async configureServer(server) {
          // Antigravity and `npx vite` run on :5173 without a separate Express
          // process. Mount only API requests here so secure wallet and
          // consultation routes work while Vite still serves the frontend.
          const { default: backendApp } = await import('./src/server/app');
          server.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith('/api/')) {
              next();
              return;
            }
            backendApp(
              req as unknown as express.Request,
              res as unknown as express.Response,
              next,
            );
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
