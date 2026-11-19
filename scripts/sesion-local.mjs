// Solo desarrollo local: crea (si hace falta) un usuario con contraseña en el Supabase local,
// inicia sesión y escribe la cookie de sesión que usa @nuxtjs/supabase, para probar las APIs con curl.
// Uso: node --env-file=.env scripts/sesion-local.mjs correo@example.com > .superpowers/cookie.txt
import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
if (!email) { console.error('Falta el email'); process.exit(1) }
const url = process.env.SUPABASE_URL
if (!url?.includes('127.0.0.1')) { console.error('Solo para Supabase local'); process.exit(1) }

const admin = createClient(url, process.env.SUPABASE_SECRET_KEY)
await admin.auth.admin.createUser({ email, password: 'clave-local-123', email_confirm: true })

const cliente = createClient(url, process.env.SUPABASE_KEY)
const { data, error } = await cliente.auth.signInWithPassword({ email, password: 'clave-local-123' })
if (error) { console.error(error.message); process.exit(1) }

const ref = new URL(url).hostname.split('.')[0]
const valor = 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64url')
process.stdout.write(`sb-${ref}-auth-token=${valor}`)
