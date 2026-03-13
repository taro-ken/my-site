import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://kentaro.life',
  output: 'server',
  adapter: vercel(),
  integrations: [icon(), react()],
  prefetch: true,
  vite: {
    plugins: [tailwindcss()],
  },
});
