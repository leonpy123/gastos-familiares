<script setup lang="ts">
const { miembro, esAdmin } = useMiembro()
</script>

<template>
  <NuxtPwaManifest />
  <NuxtPage />
  <nav v-if="miembro" class="inferior">
    <NuxtLink to="/" exact-active-class="router-link-active"><span class="icono">📊</span>Inicio</NuxtLink>
    <NuxtLink to="/nuevo"><span class="icono">➕</span>Nuevo</NuxtLink>
    <NuxtLink to="/comprobantes"><span class="icono">🧾</span>Comprobantes</NuxtLink>
    <NuxtLink v-if="esAdmin" to="/admin/configuracion"><span class="icono">⚙️</span>Admin</NuxtLink>
  </nav>
</template>
