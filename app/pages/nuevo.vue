<script setup lang="ts">
import type { BorradorComprobante, Clase } from '#shared/types'
import { parsearDictado } from '#shared/utils/dictado'
import { validarComprobante } from '#shared/utils/validacion'
import { parsearMonto, formatearGs } from '#shared/utils/montos'
import { normalizarRuc, formatearRuc } from '#shared/utils/ruc'
import { hoyEnAsuncion } from '#shared/utils/fechas'

const supabase = useSupabaseClient()
const { tipos, cargar: cargarTipos } = useTipos()
const { separadores, cargar: cargarSeparadores } = useSeparadores()
const voz = useReconocimientoVoz()

const clase = ref<Clase>('gasto')
const form = reactive({ fecha: '', tipoId: '', concepto: '', contraparte: '', ruc: '', monto: '' })
const id = ref('')
const dictado = ref('')
const errores = ref<string[]>([])
const aviso = ref('')
const enviando = ref(false)

function limpiar() {
  id.value = crypto.randomUUID()
  Object.assign(form, { fecha: hoyEnAsuncion(new Date()), tipoId: '', concepto: '', contraparte: '', ruc: '', monto: '' })
  dictado.value = ''
  errores.value = []
}

onMounted(async () => {
  limpiar()
  await Promise.all([cargarTipos(), cargarSeparadores()])
})

const tiposDeClase = computed(() => tipos.value.filter(t => t.activo && t.clase === clase.value))
const etiquetaContraparte = computed(() => (clase.value === 'gasto' ? 'Proveedor' : 'Pagador'))
const rucNormalizado = computed(() => normalizarRuc(form.ruc))
const montoNumero = computed(() => parsearMonto(form.monto))
const separador = computed(() => separadores.value[0] ?? 'tab')

watch(clase, () => {
  if (!tiposDeClase.value.some(t => t.id === form.tipoId)) form.tipoId = ''
})

function interpretar() {
  aviso.value = ''
  const r = parsearDictado(dictado.value, { separadores: separadores.value, tipos: tipos.value, ahora: new Date() })
  if (!r.ok) {
    errores.value = r.errores
    return
  }
  errores.value = []
  clase.value = r.borrador.clase
  nextTick(() => {
    Object.assign(form, {
      fecha: r.borrador.fecha,
      tipoId: r.borrador.tipoId,
      concepto: r.borrador.concepto,
      contraparte: r.borrador.contraparte,
      ruc: r.borrador.ruc,
      monto: String(r.borrador.monto),
    })
  })
}

function microfono() {
  if (voz.escuchando.value) return voz.detener()
  voz.iniciar((texto) => {
    dictado.value = dictado.value ? `${dictado.value} ${texto}` : texto
  })
}

async function sugerirContraparte() {
  const ruc = rucNormalizado.value
  if (!ruc || form.contraparte.trim()) return
  const { data } = await supabase.from('comprobantes').select('contraparte')
    .eq('ruc', ruc).is('eliminado_en', null).order('creado_en', { ascending: false }).limit(1).maybeSingle()
  if (data?.contraparte && !form.contraparte.trim()) form.contraparte = data.contraparte
}

async function guardar() {
  if (enviando.value) return
  aviso.value = ''
  const borrador: BorradorComprobante = {
    id: id.value,
    clase: clase.value,
    fecha: form.fecha,
    tipoId: form.tipoId,
    concepto: form.concepto,
    contraparte: form.contraparte,
    ruc: rucNormalizado.value ?? form.ruc,
    monto: montoNumero.value ?? 0,
  }
  errores.value = validarComprobante(borrador, tipos.value)
  if (errores.value.length) return

  enviando.value = true
  try {
    const r = await $fetch<{ planilla: 'ok' | 'pendiente' }>('/api/comprobantes', { method: 'POST', body: borrador })
    aviso.value = r.planilla === 'pendiente'
      ? 'Guardado. La planilla se actualizará más tarde.'
      : 'Guardado.'
    const claseActual = clase.value
    limpiar()
    clase.value = claseActual
  } catch (e: any) {
    errores.value = e?.data?.errores ?? ['No se pudo guardar. Revisa tu conexión e intenta de nuevo.']
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main>
    <h1>Nuevo comprobante</h1>

    <section class="tarjeta">
      <label for="dictado">Dictar comprobante</label>
      <div class="fila">
        <textarea id="dictado" v-model="dictado"
          :placeholder="`gasto ${separador} hoy ${separador} hogar ${separador} almuerzo ${separador} supermas ${separador} 8002147 ${separador} 8.000`" />
      </div>
      <p class="ayuda">
        Orden: <b>gasto/ingreso</b> · fecha · tipo · concepto · proveedor/pagador · RUC (sin dígito) · monto.
        Separa cada campo diciendo «{{ separador }}» o con una coma.
        <template v-if="!voz.soportado.value">En iPhone usa el micrófono del teclado.</template>
      </p>
      <div class="fila" style="margin-top: 8px">
        <button v-if="voz.soportado.value" class="fijo" type="button" @click="microfono">
          {{ voz.escuchando.value ? '⏹ Detener' : '🎤 Hablar' }}
        </button>
        <button type="button" :disabled="!dictado.trim()" @click="interpretar">Interpretar</button>
      </div>
    </section>

    <form class="tarjeta" @submit.prevent="guardar">
      <div class="segmentado" role="group" aria-label="Clase">
        <button type="button" :class="{ activo: clase === 'gasto' }" @click="clase = 'gasto'">Gasto</button>
        <button type="button" :class="{ activo: clase === 'ingreso' }" @click="clase = 'ingreso'">Ingreso</button>
      </div>

      <label for="fecha">Fecha</label>
      <input id="fecha" v-model="form.fecha" type="date" required>

      <label for="tipo">Tipo</label>
      <select id="tipo" v-model="form.tipoId" required>
        <option value="" disabled>Elige un tipo</option>
        <option v-for="t in tiposDeClase" :key="t.id" :value="t.id">{{ t.nombre }}</option>
      </select>

      <label for="concepto">Concepto</label>
      <input id="concepto" v-model="form.concepto" maxlength="200" required>

      <label for="ruc">RUC (sin dígito verificador)</label>
      <div class="fila">
        <input id="ruc" v-model="form.ruc" inputmode="numeric" required @blur="sugerirContraparte">
        <span class="fijo num">{{ rucNormalizado ? formatearRuc(rucNormalizado) : '' }}</span>
      </div>

      <label for="contraparte">{{ etiquetaContraparte }}</label>
      <input id="contraparte" v-model="form.contraparte" maxlength="200" required>

      <label for="monto">Monto (Gs.)</label>
      <input id="monto" v-model="form.monto" inputmode="numeric" required>
      <p class="ayuda num">{{ montoNumero ? formatearGs(montoNumero) : '' }}</p>

      <div v-if="errores.length" class="error" role="alert">
        <ul><li v-for="e in errores" :key="e">{{ e }}</li></ul>
      </div>
      <p v-if="aviso" class="ok" role="status">{{ aviso }}</p>

      <div class="fila" style="margin-top: 12px">
        <button class="fijo" type="button" @click="limpiar(); aviso = ''">Limpiar</button>
        <button class="primario" type="submit" :disabled="enviando">{{ enviando ? 'Guardando…' : 'Guardar' }}</button>
      </div>
    </form>
  </main>
</template>
