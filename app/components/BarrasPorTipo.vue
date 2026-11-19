<script setup lang="ts">
import type { ItemResumen } from '#shared/types'
import { formatearGs } from '#shared/utils/montos'

defineProps<{ titulo: string; items: ItemResumen[] }>()
</script>

<template>
  <section class="tarjeta">
    <h2 style="margin-top: 0">{{ titulo }}</h2>
    <p v-if="!items.length" class="ayuda">Sin movimientos en el período.</p>
    <ul class="barras">
      <li v-for="i in items" :key="i.tipoId" :title="`${i.nombre}: ${formatearGs(i.monto)} (${i.pct} %)`">
        <div class="etiqueta">
          <span>{{ i.nombre }}</span>
          <span class="num"><b>{{ i.pct }} %</b> · {{ formatearGs(i.monto) }}</span>
        </div>
        <div class="pista"><div class="barra" :style="{ width: `${Math.max(i.pct, 0.5)}%` }" /></div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.barras { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.etiqueta { display: flex; justify-content: space-between; gap: 8px; font-size: .9rem; margin-bottom: 4px; }
.pista { height: 10px; }
.barra { height: 100%; background: var(--primario); border-radius: 0 4px 4px 0; }
</style>
