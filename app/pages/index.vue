<script setup lang="ts">
import type { ComprobanteDetalle } from '#shared/types'
import { calcularResumen, rangoPeriodo } from '#shared/utils/resumen'
import { formatearGs } from '#shared/utils/montos'
import { MESES } from '../composables/useComprobantes'

const periodo = usePeriodo()
const comprobantes = ref<ComprobanteDetalle[]>([])
const cargando = ref(false)
const error = ref('')

async function recargar() {
  cargando.value = true
  error.value = ''
  try {
    const { desde, hasta } = rangoPeriodo(periodo.value)
    comprobantes.value = await cargarComprobantes(desde, hasta)
  } catch {
    error.value = 'No se pudieron cargar los datos. Revisa tu conexión.'
  } finally {
    cargando.value = false
  }
}

onMounted(recargar)
watch(periodo, recargar, { deep: true })

const resumen = computed(() => calcularResumen(comprobantes.value))
const titulo = computed(() => periodo.value.mes ? `${MESES[periodo.value.mes - 1]} ${periodo.value.anio}` : `Año ${periodo.value.anio}`)
</script>

<template>
  <main>
    <div class="fila" style="justify-content: space-between">
      <h1 class="fijo">{{ titulo }}</h1>
      <NuxtLink to="/nuevo" class="fijo"><button class="primario">+ Nuevo</button></NuxtLink>
    </div>
    <SelectorPeriodo />

    <p v-if="error" class="error">{{ error }}</p>

    <section class="kpis" :aria-busy="cargando">
      <div class="tarjeta"><div class="ayuda">↑ Ingresos</div><div class="valor num">{{ formatearGs(resumen.totalIngresos) }}</div></div>
      <div class="tarjeta"><div class="ayuda">↓ Gastos</div><div class="valor num">{{ formatearGs(resumen.totalGastos) }}</div></div>
      <div class="tarjeta"><div class="ayuda">= Saldo</div><div class="valor num">{{ formatearGs(resumen.saldo) }}</div></div>
      <div class="tarjeta">
        <div class="ayuda">Gastos sobre ingresos</div>
        <div class="valor num">{{ resumen.pctGastosSobreIngresos === null ? '—' : `${resumen.pctGastosSobreIngresos} %` }}</div>
      </div>
    </section>

    <BarrasPorTipo titulo="Gastos por tipo" :items="resumen.gastosPorTipo" />
    <BarrasPorTipo titulo="Ingresos por tipo" :items="resumen.ingresosPorTipo" />

    <NuxtLink to="/comprobantes">Ver los {{ comprobantes.length }} comprobantes del período →</NuxtLink>
  </main>
</template>

<style scoped>
.kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
.kpis .tarjeta { margin: 0; }
.valor { font-size: 1.2rem; font-weight: 700; margin-top: 2px; }
@media (min-width: 640px) { .kpis { grid-template-columns: repeat(4, 1fr); } }
</style>
