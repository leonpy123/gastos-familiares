const RUTAS_PUBLICAS = ['/login', '/no-autorizado', '/confirmar']

export default defineNuxtRouteMiddleware(async (to) => {
  if (RUTAS_PUBLICAS.includes(to.path)) return

  const usuario = useSupabaseUser()
  if (!usuario.value) return navigateTo('/login')

  const { miembro, esAdmin, cargar } = useMiembro()
  if (!miembro.value) {
    try {
      await cargar()
    } catch (e: any) {
      const estado = e?.statusCode ?? e?.response?.status
      if (estado === 403) return navigateTo('/no-autorizado')
      if (estado === 401) return navigateTo('/login')
      throw e
    }
  }

  if (to.path.startsWith('/admin') && !esAdmin.value) return navigateTo('/')
})
