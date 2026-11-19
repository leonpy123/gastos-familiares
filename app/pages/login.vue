<script setup lang="ts">
const supabase = useSupabaseClient()
const error = ref('')

async function entrar() {
  error.value = ''
  const { error: e } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/confirmar` },
  })
  if (e) error.value = 'No se pudo iniciar sesión con Google. Intenta de nuevo.'
}
</script>

<template>
  <main class="centro">
    <h1>Gastos Familiares</h1>
    <p>Ingresos y gastos de la familia, en un solo lugar.</p>
    <button class="primario" @click="entrar">Entrar con Google</button>
    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>
