export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/supabase'],
  css: ['~/assets/main.css'],
  supabase: {
    // El middleware propio (app/middleware/auth.global.ts) decide las redirecciones.
    redirect: false,
    types: false,
  },
  runtimeConfig: {
    adminInicialEmail: process.env.ADMIN_INICIAL_EMAIL ?? '',
  },
  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      title: 'Gastos Familiares',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
    },
  },
})
