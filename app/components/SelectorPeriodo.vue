<script setup lang="ts">
import { MESES } from '../composables/useComprobantes'

const periodo = usePeriodo()
const anioActual = new Date().getFullYear()
const anios = Array.from({ length: 6 }, (_, i) => anioActual + 1 - i)

const mes = computed({
  get: () => periodo.value.mes ?? 0,
  set: (m: number) => { periodo.value = { anio: periodo.value.anio, mes: m || undefined } },
})
const anio = computed({
  get: () => periodo.value.anio,
  set: (a: number) => { periodo.value = { anio: a, mes: periodo.value.mes } },
})
</script>

<template>
  <div class="fila">
    <select v-model.number="mes" aria-label="Mes">
      <option :value="0">Año completo</option>
      <option v-for="(n, i) in MESES" :key="n" :value="i + 1">{{ n }}</option>
    </select>
    <select v-model.number="anio" aria-label="Año" class="fijo" style="width: 110px">
      <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
    </select>
  </div>
</template>
