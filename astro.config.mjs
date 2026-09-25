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
  prefetch: false,
  redirects: {
    // /membership は廃止し、Essenceの紹介ページに集約した(ログイン後のリダイレクト等の旧導線用)。
    '/membership': { status: 301, destination: '/essence' },
    // Blog は Article に改称(旧URLへの既存リンク・ブックマーク対策)。
    '/blog': { status: 301, destination: '/article' },
    '/blog/[slug]': { status: 301, destination: '/article/[slug]' },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
