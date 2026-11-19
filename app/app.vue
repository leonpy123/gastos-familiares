<script setup lang="ts">
const { miembro, esAdmin, limpiar } = useMiembro()
const supabase = useSupabaseClient()

async function salir() {
  await supabase.auth.signOut()
  limpiar()
  await navigateTo('/login')
}
</script>

<template>
  <NuxtPwaManifest />
  <NuxtPage />
  <nav v-if="miembro" class="inferior">
    <NuxtLink to="/" exact-active-class="router-link-active"><span class="icono">📊</span>Inicio</NuxtLink>
    <NuxtLink to="/nuevo"><span class="icono">➕</span>Nuevo</NuxtLink>
    <NuxtLink to="/comprobantes"><span class="icono">🧾</span>Comprobantes</NuxtLink>
    <NuxtLink v-if="esAdmin" to="/admin/configuracion"><span class="icono">⚙️</span>Admin</NuxtLink>
    <a href="/login" @click.prevent="salir"><span class="icono">🚪</span>Salir</a>
  </nav>
</template>
