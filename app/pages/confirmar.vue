<script setup lang="ts">
// Destino del login con Google: el cliente de Supabase toma la sesión de la URL.
const usuario = useSupabaseUser()
watch(usuario, (u) => { if (u) navigateTo('/') }, { immediate: true })
</script>

<template>
  <main class="centro"><p>Entrando…</p></main>
</template>
