<template>
  <nav class="segmentado" style="margin-bottom: 16px" aria-label="Administración">
    <NuxtLink v-for="l in links" :key="l.to" :to="l.to" custom v-slot="{ navigate, isActive }">
      <button type="button" :class="{ activo: isActive }" @click="navigate">{{ l.texto }}</button>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const links = [
  { to: '/admin/configuracion', texto: 'General' },
  { to: '/admin/miembros', texto: 'Miembros' },
  { to: '/admin/tipos', texto: 'Tipos' },
  { to: '/admin/eliminados', texto: 'Eliminados' },
]
</script>
