<script setup lang="ts">
const supabase = useSupabaseClient()
const { limpiar } = useMiembro()
onMounted(async () => {
  limpiar()
  await supabase.auth.signOut()
})
</script>

<template>
  <main class="centro">
    <h1>Acceso no autorizado</h1>
    <p>Tu cuenta de Google no está autorizada. Pide al administrador que te agregue.</p>
    <NuxtLink to="/login">Volver</NuxtLink>
  </main>
</template>
