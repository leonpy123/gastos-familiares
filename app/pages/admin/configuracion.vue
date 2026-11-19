<script setup lang="ts">
import { parsearSeparadores } from '#shared/utils/separadores'
import { formatearFechaHora } from '#shared/utils/fechas'

const supabase = useSupabaseClient()
const { tipos, cargar: cargarTipos } = useTipos()
const { separadores, cargar: cargarSeparadores } = useSeparadores()

const texto = ref('')
const planilla = ref<{ pendiente: boolean; ultima_sync: string | null; ultimo_error: string | null } | null>(null)
const mensaje = ref('')
const error = ref('')
const sincronizando = ref(false)

async function cargarPlanilla() {
  const { data } = await supabase.from('configuracion').select('valor').eq('clave', 'planilla').maybeSingle()
  planilla.value = (data?.valor as any) ?? null
}

onMounted(async () => {
  await Promise.all([cargarTipos(), cargarSeparadores(), cargarPlanilla()])
  texto.value = separadores.value.join(', ')
})

async function guardarSeparadores() {
  mensaje.value = ''
  error.value = ''
  const r = parsearSeparadores(texto.value, tipos.value)
  if (!r.ok) { error.value = r.error; return }
  const { error: e } = await supabase.from('configuracion').update({ valor: r.valor }).eq('clave', 'separadores_dictado')
  if (e) { error.value = 'No se pudo guardar.'; return }
  separadores.value = r.valor
  texto.value = r.valor.join(', ')
  mensaje.value = 'Separadores guardados.'
}

async function resincronizar() {
  mensaje.value = ''
  error.value = ''
  sincronizando.value = true
  try {
    const r = await $fetch<{ ok: boolean; error?: string }>('/api/planilla/sincronizar', { method: 'POST' })
    if (r.ok) mensaje.value = 'Planilla actualizada.'
    else error.value = `No se pudo actualizar la planilla: ${r.error}`
  } catch {
    error.value = 'No se pudo actualizar la planilla.'
  } finally {
    sincronizando.value = false
    await cargarPlanilla()
  }
}
</script>

<template>
  <main>
    <h1>Administración</h1>
    <AdminNav />

    <p v-if="mensaje" class="ok">{{ mensaje }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="tarjeta">
      <h2 style="margin-top: 0">Palabra separadora del dictado</h2>
      <label for="sep">Palabras (separadas por coma)</label>
      <input id="sep" v-model="texto">
      <p class="ayuda">La primera es la que se muestra en la ayuda. La coma siempre funciona como separador.</p>
      <button class="primario" @click="guardarSeparadores">Guardar</button>
    </section>

    <section class="tarjeta">
      <h2 style="margin-top: 0">Planilla de Google</h2>
      <template v-if="planilla">
        <p>
          Estado: <b>{{ planilla.pendiente ? '⚠ Pendiente de actualizar' : '✓ Al día' }}</b><br>
          Última actualización: {{ planilla.ultima_sync ? formatearFechaHora(planilla.ultima_sync) : 'nunca' }}
        </p>
        <p v-if="planilla.ultimo_error" class="ayuda">Último error: {{ planilla.ultimo_error }}</p>
      </template>
      <button :disabled="sincronizando" @click="resincronizar">{{ sincronizando ? 'Actualizando…' : 'Resincronizar planilla' }}</button>
    </section>
  </main>
</template>
