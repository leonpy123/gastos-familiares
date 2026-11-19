<script setup lang="ts">
import { formatearGs } from '../../../shared/utils/montos'
import { formatearFecha, formatearFechaHora } from '../../../shared/utils/fechas'
import { formatearRuc } from '../../../shared/utils/ruc'

interface Eliminado {
  id: string; clase: 'ingreso' | 'gasto'; fecha: string; concepto: string; contraparte: string
  ruc: string; monto: number; eliminado_en: string; motivo_eliminacion: string | null
  tipo: { nombre: string } | null
  creador: { nombre: string } | null
  eliminador: { nombre: string } | null
}

const supabase = useSupabaseClient()
const eliminados = ref<Eliminado[]>([])
const error = ref('')

onMounted(async () => {
  const { data, error: e } = await supabase.from('comprobantes')
    .select('id, clase, fecha, concepto, contraparte, ruc, monto, eliminado_en, motivo_eliminacion, ' +
      'tipo:tipos(nombre), creador:miembros!comprobantes_creado_por_fkey(nombre), eliminador:miembros!comprobantes_eliminado_por_fkey(nombre)')
    .not('eliminado_en', 'is', null).order('eliminado_en', { ascending: false }).limit(500)
  if (e) { error.value = 'No se pudo cargar el historial.'; return }
  eliminados.value = (data ?? []) as unknown as Eliminado[]
})
</script>

<template>
  <main>
    <h1>Administración</h1>
    <AdminNav />
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!eliminados.length" class="ayuda">No hay comprobantes eliminados.</p>

    <article v-for="c in eliminados" :key="c.id" class="tarjeta">
      <div class="fila" style="justify-content: space-between">
        <span class="fijo">{{ c.clase === 'ingreso' ? '↑ Ingreso' : '↓ Gasto' }} · {{ formatearFecha(c.fecha) }}</span>
        <b class="fijo num"><s>{{ formatearGs(Number(c.monto)) }}</s></b>
      </div>
      <div><b>{{ c.tipo?.nombre }}</b> — {{ c.concepto }}</div>
      <div class="ayuda">{{ c.contraparte }} · RUC {{ formatearRuc(c.ruc) }} · cargó {{ c.creador?.nombre }}</div>
      <div class="ayuda">
        Eliminado por <b>{{ c.eliminador?.nombre }}</b> el {{ formatearFechaHora(c.eliminado_en) }}
        <template v-if="c.motivo_eliminacion"> — motivo: {{ c.motivo_eliminacion }}</template>
      </div>
    </article>
  </main>
</template>
