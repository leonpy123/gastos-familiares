<script setup lang="ts">
import type { Clase, Tipo } from '#shared/types'

const supabase = useSupabaseClient()
const { tipos, cargar } = useTipos()
const clase = ref<Clase>('gasto')
const nuevo = reactive({ nombre: '', palabras: '' })
const editando = ref<string | null>(null)
const edicion = reactive({ nombre: '', palabras: '' })
const mensaje = ref('')
const error = ref('')

onMounted(cargar)
const deClase = computed(() => tipos.value.filter(t => t.clase === clase.value))

const aLista = (s: string) => [...new Set(s.split(',').map(p => p.trim().toLowerCase()).filter(Boolean))]

function errorDe(e: { code?: string } | null) {
  return e?.code === '23505' ? 'Ya existe un tipo con ese nombre.' : 'No se pudo guardar.'
}

async function agregar() {
  mensaje.value = ''
  error.value = ''
  const nombre = nuevo.nombre.trim()
  if (!nombre) { error.value = 'Falta el nombre.'; return }
  const palabras = aLista(nuevo.palabras)
  const { error: e } = await supabase.from('tipos').insert({ clase: clase.value, nombre, palabras_clave: palabras.length ? palabras : [nombre.toLowerCase()] })
  if (e) { error.value = errorDe(e); return }
  Object.assign(nuevo, { nombre: '', palabras: '' })
  mensaje.value = `Tipo "${nombre}" agregado.`
  await cargar()
}

function editar(t: Tipo) {
  editando.value = t.id
  edicion.nombre = t.nombre
  edicion.palabras = t.palabras_clave.join(', ')
}

async function guardarEdicion(t: Tipo) {
  mensaje.value = ''
  error.value = ''
  const nombre = edicion.nombre.trim()
  if (!nombre) { error.value = 'Falta el nombre.'; return }
  const { error: e } = await supabase.from('tipos').update({ nombre, palabras_clave: aLista(edicion.palabras) }).eq('id', t.id)
  if (e) { error.value = errorDe(e); return }
  editando.value = null
  await cargar()
}

async function alternarActivo(t: Tipo) {
  error.value = ''
  const { error: e } = await supabase.from('tipos').update({ activo: !t.activo }).eq('id', t.id)
  if (e) { error.value = 'No se pudo actualizar.'; return }
  await cargar()
}
</script>

<template>
  <main>
    <h1>Administración</h1>
    <AdminNav />

    <div class="segmentado" role="group" aria-label="Clase">
      <button type="button" :class="{ activo: clase === 'gasto' }" @click="clase = 'gasto'">Tipos de gasto</button>
      <button type="button" :class="{ activo: clase === 'ingreso' }" @click="clase = 'ingreso'">Tipos de ingreso</button>
    </div>

    <p v-if="mensaje" class="ok">{{ mensaje }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <form class="tarjeta" style="margin-top: 12px" @submit.prevent="agregar">
      <h2 style="margin-top: 0">Agregar tipo de {{ clase }}</h2>
      <label for="nt">Nombre</label>
      <input id="nt" v-model="nuevo.nombre" required>
      <label for="np">Palabras clave para el dictado (separadas por coma)</label>
      <input id="np" v-model="nuevo.palabras" placeholder="ej.: colegio, escuela">
      <p class="ayuda">Si no pones ninguna, se usa el nombre.</p>
      <button class="primario" type="submit">Agregar</button>
    </form>

    <article v-for="t in deClase" :key="t.id" class="tarjeta">
      <template v-if="editando === t.id">
        <label :for="`n-${t.id}`">Nombre</label>
        <input :id="`n-${t.id}`" v-model="edicion.nombre">
        <label :for="`p-${t.id}`">Palabras clave</label>
        <input :id="`p-${t.id}`" v-model="edicion.palabras">
        <div class="fila" style="margin-top: 8px">
          <button class="fijo" @click="editando = null">Cancelar</button>
          <button class="primario fijo" @click="guardarEdicion(t)">Guardar</button>
        </div>
      </template>
      <template v-else>
        <div><b>{{ t.nombre }}</b> <span v-if="!t.activo" class="ayuda">(desactivado)</span></div>
        <div class="ayuda">Dictado: {{ t.palabras_clave.join(', ') || '—' }}</div>
        <div class="fila" style="margin-top: 8px">
          <button class="fijo" @click="editar(t)">Editar</button>
          <button class="fijo" @click="alternarActivo(t)">{{ t.activo ? 'Desactivar' : 'Activar' }}</button>
        </div>
      </template>
    </article>
  </main>
</template>
