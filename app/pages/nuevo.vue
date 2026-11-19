<script setup lang="ts">
import type { BorradorComprobante, Clase } from '#shared/types'
import { analizarDictadoParcial, parsearDictado, type CampoDictado } from '#shared/utils/dictado'
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
const provisorio = ref('')
const enDictado = ref(false)
const errores = ref<string[]>([])
const aviso = ref('')
const enviando = ref(false)

function limpiar() {
  id.value = crypto.randomUUID()
  Object.assign(form, { fecha: hoyEnAsuncion(new Date()), tipoId: '', concepto: '', contraparte: '', ruc: '', monto: '' })
  dictado.value = ''
  provisorio.value = ''
  enDictado.value = false
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

// ───── Dictado en vivo ─────
const textoVivo = computed(() => [dictado.value, provisorio.value].filter(s => s.trim()).join(' '))
const parcial = computed(() => analizarDictadoParcial(textoVivo.value, {
  separadores: separadores.value, tipos: tipos.value, ahora: new Date(),
}))
const campoActivo = computed<CampoDictado | null>(() => (enDictado.value ? parcial.value.campoActual : null))
const NOMBRES: Record<CampoDictado, string> = {
  clase: 'gasto o ingreso', fecha: 'Fecha', tipo: 'Tipo', concepto: 'Concepto', contraparte: 'Proveedor / Pagador', ruc: 'RUC', monto: 'Monto',
}
const opcionesTipo = computed(() => {
  const s = parcial.value.sugerenciasTipo
  return s.length ? s : tiposDeClase.value
})

watch(parcial, (p) => {
  if (!enDictado.value || !textoVivo.value.trim()) return
  if (p.clase) clase.value = p.clase
  nextTick(() => {
    if (p.fecha) form.fecha = p.fecha
    if (p.tipoId) form.tipoId = p.tipoId
    form.concepto = p.concepto
    form.contraparte = p.contraparte
    form.ruc = p.ruc
    form.monto = p.monto ? String(p.monto) : ''
  })
})

watch(campoActivo, (c) => {
  if (!c) return
  nextTick(() => document.querySelector('.campo.activo')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
})

function interpretar() {
  aviso.value = ''
  enDictado.value = false
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
  dictado.value = '' // cada toque en "Hablar" empieza un dictado nuevo
  provisorio.value = ''
  errores.value = []
  aviso.value = ''
  enDictado.value = true
  voz.iniciar({
    alFinal: (texto) => { dictado.value = dictado.value ? `${dictado.value} ${texto}` : texto },
    alProvisorio: (texto) => { provisorio.value = texto },
    alTerminar: () => { if (dictado.value.trim()) interpretar() },
  })
}

function elegirTipo(tipoId: string) {
  form.tipoId = tipoId
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
  enDictado.value = false
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
      <textarea id="dictado" v-model="dictado" @input="enDictado = true"
        :placeholder="`gasto ${separador} hoy ${separador} hogar ${separador} almuerzo ${separador} supermas ${separador} 8002147 ${separador} 8.000`" />
      <p v-if="provisorio" class="ayuda escuchando">🎤 {{ provisorio }}…</p>
      <p class="ayuda">
        Orden: <b>gasto/ingreso</b> · fecha · tipo · concepto · proveedor/pagador · RUC (sin dígito) · monto.
        Separa cada campo diciendo «{{ separador }}» o con una coma.
        <template v-if="!voz.soportado.value">En iPhone usa el micrófono del teclado.</template>
      </p>
      <div class="fila" style="margin-top: 8px">
        <button v-if="voz.soportado.value" class="fijo" :class="{ primario: voz.escuchando.value }" type="button" @click="microfono">
          {{ voz.escuchando.value ? '⏹ Detener' : '🎤 Hablar' }}
        </button>
        <button type="button" :disabled="!dictado.trim()" @click="interpretar">Interpretar</button>
      </div>
    </section>

    <form class="tarjeta" @submit.prevent="guardar">
      <div class="campo" :class="{ activo: campoActivo === 'clase' }">
        <span v-if="campoActivo === 'clase'" class="ahora">🎤 Ahora: {{ NOMBRES.clase }}</span>
        <div class="segmentado" role="group" aria-label="Clase">
          <button type="button" :class="{ activo: clase === 'gasto' }" @click="clase = 'gasto'">Gasto</button>
          <button type="button" :class="{ activo: clase === 'ingreso' }" @click="clase = 'ingreso'">Ingreso</button>
        </div>
      </div>

      <div class="campo" :class="{ activo: campoActivo === 'fecha' }">
        <label for="fecha">Fecha <span v-if="campoActivo === 'fecha'" class="ahora">🎤 Ahora</span></label>
        <input id="fecha" v-model="form.fecha" type="date" required>
      </div>

      <div class="campo" :class="{ activo: campoActivo === 'tipo' }">
        <label for="tipo">Tipo <span v-if="campoActivo === 'tipo'" class="ahora">🎤 Ahora: di uno de estos</span></label>
        <select id="tipo" v-model="form.tipoId" required>
          <option value="" disabled>Elige un tipo</option>
          <option v-for="t in tiposDeClase" :key="t.id" :value="t.id">{{ t.nombre }}</option>
        </select>
        <div v-if="campoActivo === 'tipo'" class="chips" role="list" aria-label="Tipos disponibles">
          <button v-for="t in opcionesTipo" :key="t.id" type="button" role="listitem"
            :class="{ elegido: form.tipoId === t.id }" @click="elegirTipo(t.id)">
            {{ t.nombre }}<small v-if="t.palabras_clave.length"> · «{{ t.palabras_clave[0] }}»</small>
          </button>
        </div>
      </div>

      <div class="campo" :class="{ activo: campoActivo === 'concepto' }">
        <label for="concepto">Concepto <span v-if="campoActivo === 'concepto'" class="ahora">🎤 Ahora</span></label>
        <input id="concepto" v-model="form.concepto" maxlength="200" required>
      </div>

      <div class="campo" :class="{ activo: campoActivo === 'contraparte' }">
        <label for="contraparte">{{ etiquetaContraparte }} <span v-if="campoActivo === 'contraparte'" class="ahora">🎤 Ahora</span></label>
        <input id="contraparte" v-model="form.contraparte" maxlength="200" required>
      </div>

      <div class="campo" :class="{ activo: campoActivo === 'ruc' }">
        <label for="ruc">RUC (sin dígito verificador) <span v-if="campoActivo === 'ruc'" class="ahora">🎤 Ahora</span></label>
        <div class="fila">
          <input id="ruc" v-model="form.ruc" inputmode="numeric" required @blur="sugerirContraparte">
          <span class="fijo num">{{ rucNormalizado ? formatearRuc(rucNormalizado) : '' }}</span>
        </div>
      </div>

      <div class="campo" :class="{ activo: campoActivo === 'monto' }">
        <label for="monto">Monto (Gs.) <span v-if="campoActivo === 'monto'" class="ahora">🎤 Ahora</span></label>
        <input id="monto" v-model="form.monto" inputmode="numeric" required>
        <p class="ayuda num">{{ montoNumero ? formatearGs(montoNumero) : '' }}</p>
      </div>

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

<style scoped>
.campo { border-radius: 10px; padding: 2px 8px 8px; margin: 4px -8px 0; border: 2px solid transparent; transition: border-color .15s, background-color .15s; }
.campo.activo { border-color: var(--primario); background: var(--fondo); }
.ahora { color: var(--primario); font-weight: 600; font-size: .8rem; margin-left: 6px; }
.campo > .ahora { display: block; margin: 6px 0 4px; }
.escuchando { font-style: italic; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.chips button { padding: 6px 10px; font-size: .9rem; }
.chips button.elegido { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); }
.chips small { opacity: .75; }
@media (prefers-reduced-motion: reduce) { .campo { transition: none; } }
</style>
