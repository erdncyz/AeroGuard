import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const swimmingUser = env.SWIMMING_API_USER;
    const swimmingPassword = env.SWIMMING_API_PASSWORD;
    const hasSwimmingAuth = Boolean(swimmingUser && swimmingPassword);
    const swimmingAuth = hasSwimmingAuth
      ? Buffer.from(`${swimmingUser}:${swimmingPassword}`).toString('base64')
      : '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/swimming': {
            target: env.SWIMMING_API_BASE_URL || 'https://csbsapi.saglik.gov.tr/api/app/portal-public',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/swimming/, ''),
            headers: hasSwimmingAuth
              ? {
                  Authorization: `Basic ${swimmingAuth}`,
                }
              : {},
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
