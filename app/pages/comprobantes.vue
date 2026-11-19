<script setup lang="ts">
import type { ComprobanteDetalle } from '#shared/types'
import { rangoPeriodo } from '#shared/utils/resumen'
import { formatearGs } from '#shared/utils/montos'
import { formatearFecha } from '#shared/utils/fechas'
import { formatearRuc } from '#shared/utils/ruc'

const periodo = usePeriodo()
const { esAdmin } = useMiembro()
const { tipos, cargar: cargarTipos } = useTipos()
const comprobantes = ref<ComprobanteDetalle[]>([])
const filtros = reactive({ clase: '', tipoId: '', miembro: '' })
const mensaje = ref('')
const error = ref('')

async function recargar() {
  error.value = ''
  try {
    const { desde, hasta } = rangoPeriodo(periodo.value)
    comprobantes.value = await cargarComprobantes(desde, hasta)
  } catch {
    error.value = 'No se pudieron cargar los comprobantes.'
  }
}

onMounted(() => Promise.all([recargar(), cargarTipos()]))
watch(periodo, recargar, { deep: true })

const miembros = computed(() => [...new Set(comprobantes.value.map(c => c.creadoPorNombre))].sort())
const tiposFiltro = computed(() => tipos.value.filter(t => !filtros.clase || t.clase === filtros.clase))
const visibles = computed(() => comprobantes.value.filter(c =>
  (!filtros.clase || c.clase === filtros.clase) &&
  (!filtros.tipoId || c.tipoId === filtros.tipoId) &&
  (!filtros.miembro || c.creadoPorNombre === filtros.miembro)))

async function eliminar(c: ComprobanteDetalle) {
  const descripcion = `${formatearFecha(c.fecha)} · ${c.tipoNombre} · ${c.concepto} · ${formatearGs(c.monto)}`
  if (!confirm(`¿Eliminar este comprobante?\n\n${descripcion}\n\nNo se puede deshacer.`)) return
  const motivo = prompt('Motivo (opcional):') ?? ''
  mensaje.value = ''
  error.value = ''
  try {
    const r = await $fetch<{ planilla: string }>(`/api/comprobantes/${c.id}`, { method: 'DELETE', body: { motivo } })
    mensaje.value = r.planilla === 'pendiente' ? 'Eliminado. La planilla se actualizará más tarde.' : 'Eliminado.'
    await recargar()
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'No se pudo eliminar.'
  }
}
</script>

<template>
  <main>
    <h1>Comprobantes</h1>
    <SelectorPeriodo />
    <div class="fila" style="margin-top: 8px">
      <select v-model="filtros.clase" aria-label="Clase" @change="filtros.tipoId = ''">
        <option value="">Ingresos y gastos</option>
        <option value="ingreso">Solo ingresos</option>
        <option value="gasto">Solo gastos</option>
      </select>
      <select v-model="filtros.tipoId" aria-label="Tipo">
        <option value="">Todos los tipos</option>
        <option v-for="t in tiposFiltro" :key="t.id" :value="t.id">{{ t.nombre }}</option>
      </select>
      <select v-model="filtros.miembro" aria-label="Cargado por">
        <option value="">Todos los miembros</option>
        <option v-for="m in miembros" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>

    <p v-if="mensaje" class="ok">{{ mensaje }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p class="ayuda">{{ visibles.length }} comprobantes</p>

    <article v-for="c in visibles" :key="c.id" class="tarjeta">
      <div class="fila" style="justify-content: space-between">
        <span class="fijo">{{ c.clase === 'ingreso' ? '↑ Ingreso' : '↓ Gasto' }} · {{ formatearFecha(c.fecha) }}</span>
        <b class="fijo num">{{ formatearGs(c.monto) }}</b>
      </div>
      <div><b>{{ c.tipoNombre }}</b> — {{ c.concepto }}</div>
      <div class="ayuda">
        {{ c.clase === 'gasto' ? 'Proveedor' : 'Pagador' }}: {{ c.contraparte }} · RUC {{ formatearRuc(c.ruc) }}
        · cargó {{ c.creadoPorNombre }}
      </div>
      <button v-if="esAdmin" class="peligro" style="margin-top: 8px" @click="eliminar(c)">Eliminar</button>
    </article>
  </main>
</template>
