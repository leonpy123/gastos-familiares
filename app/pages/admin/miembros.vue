<script setup lang="ts">
import type { Miembro } from '../../../server/utils/miembros'

const supabase = useSupabaseClient()
const { miembro: yo } = useMiembro()
const miembros = ref<Miembro[]>([])
const nuevo = reactive({ email: '', nombre: '', rol: 'miembro' as 'admin' | 'miembro' })
const mensaje = ref('')
const error = ref('')

async function cargar() {
  const { data, error: e } = await supabase.from('miembros').select('id, email, nombre, rol, activo').order('nombre')
  if (e) { error.value = 'No se pudieron cargar los miembros.'; return }
  miembros.value = (data ?? []) as Miembro[]
}
onMounted(cargar)

async function agregar() {
  mensaje.value = ''
  error.value = ''
  const email = nuevo.email.trim().toLowerCase()
  const nombre = nuevo.nombre.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error.value = 'Email inválido.'; return }
  if (!nombre) { error.value = 'Falta el nombre.'; return }
  const { error: e } = await supabase.from('miembros').insert({ email, nombre, rol: nuevo.rol })
  if (e) { error.value = e.code === '23505' ? 'Ese email ya está registrado.' : 'No se pudo agregar.'; return }
  Object.assign(nuevo, { email: '', nombre: '', rol: 'miembro' })
  mensaje.value = `${nombre} fue agregado. Ya puede entrar con su cuenta de Google.`
  await cargar()
}

async function actualizar(m: Miembro, cambios: Partial<Pick<Miembro, 'rol' | 'activo' | 'nombre'>>) {
  mensaje.value = ''
  error.value = ''
  if (m.id === yo.value?.id && (cambios.rol === 'miembro' || cambios.activo === false)) {
    error.value = 'No puedes quitarte el rol de administrador ni desactivarte a ti mismo.'
    return
  }
  const { error: e } = await supabase.from('miembros').update(cambios).eq('id', m.id)
  if (e) { error.value = 'No se pudo actualizar.'; return }
  await cargar()
}
</script>

<template>
  <main>
    <h1>Administración</h1>
    <AdminNav />

    <p v-if="mensaje" class="ok">{{ mensaje }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <form class="tarjeta" @submit.prevent="agregar">
      <h2 style="margin-top: 0">Agregar miembro</h2>
      <label for="email">Email de su cuenta de Google</label>
      <input id="email" v-model="nuevo.email" type="email" autocomplete="off" required>
      <label for="nombre">Nombre</label>
      <input id="nombre" v-model="nuevo.nombre" required>
      <label for="rol">Rol</label>
      <select id="rol" v-model="nuevo.rol">
        <option value="miembro">Miembro</option>
        <option value="admin">Administrador</option>
      </select>
      <button class="primario" type="submit" style="margin-top: 12px">Agregar</button>
    </form>

    <article v-for="m in miembros" :key="m.id" class="tarjeta">
      <div><b>{{ m.nombre }}</b> <span v-if="m.id === yo?.id" class="ayuda">(tú)</span></div>
      <div class="ayuda">{{ m.email }} · {{ m.rol === 'admin' ? 'Administrador' : 'Miembro' }} · {{ m.activo ? 'Activo' : 'Desactivado' }}</div>
      <div class="fila" style="margin-top: 8px">
        <button class="fijo" @click="actualizar(m, { rol: m.rol === 'admin' ? 'miembro' : 'admin' })">
          {{ m.rol === 'admin' ? 'Quitar admin' : 'Hacer admin' }}
        </button>
        <button class="fijo" :class="{ peligro: m.activo }" @click="actualizar(m, { activo: !m.activo })">
          {{ m.activo ? 'Desactivar' : 'Activar' }}
        </button>
      </div>
    </article>
  </main>
</template>
