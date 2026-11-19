import { esClaveSecreta } from './shared/utils/claves'

// SUPABASE_KEY se envía al navegador: tiene que ser la clave publishable/anon, nunca la secreta.
for (const nombre of ['SUPABASE_KEY', 'NUXT_PUBLIC_SUPABASE_KEY']) {
  if (esClaveSecreta(process.env[nombre])) {
    throw new Error(`${nombre} contiene la clave SECRETA de Supabase y quedaría pública en el navegador. `
      + 'Pon en SUPABASE_KEY la clave "publishable" (o anon) y la secreta solo en SUPABASE_SECRET_KEY.')
  }
}

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/supabase', '@vite-pwa/nuxt'],
  css: ['~/assets/main.css'],
  supabase: {
    // El middleware propio (app/middleware/auth.global.ts) decide las redirecciones.
    redirect: false,
    types: false,
  },
  runtimeConfig: {
    adminInicialEmail: process.env.ADMIN_INICIAL_EMAIL ?? '',
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Gastos Familiares',
      short_name: 'Gastos',
      description: 'Ingresos y gastos de la familia',
      lang: 'es',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      background_color: '#f6f7f9',
      theme_color: '#1f6feb',
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Solo se guardan los archivos de la app. Páginas, /api y Supabase van siempre a la red (sin modo sin conexión).
      globPatterns: ['**/*.{js,css,png,svg,ico}'],
      navigateFallback: null,
      runtimeCaching: [],
    },
    client: { installPrompt: false },
    devOptions: { enabled: false },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      title: 'Gastos Familiares',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#1f6feb' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Gastos' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/icono.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },
})
