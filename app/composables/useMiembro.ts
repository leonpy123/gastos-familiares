import type { Miembro } from '../../server/utils/miembros'

export function useMiembro() {
  const miembro = useState<Miembro | null>('miembro', () => null)
  const esAdmin = computed(() => miembro.value?.rol === 'admin')

  async function cargar() {
    miembro.value = await $fetch<Miembro>('/api/yo', { headers: useRequestHeaders(['cookie']) })
  }

  function limpiar() {
    miembro.value = null
  }

  return { miembro, esAdmin, cargar, limpiar }
}
