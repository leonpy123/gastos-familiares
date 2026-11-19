import { describe, it, expect, beforeEach } from 'vitest'
import { asegurarAdminInicial, type Miembro, type RepoMiembros } from '../../server/utils/miembros'

function repoEnMemoria(inicial: Miembro[] = []) {
  const miembros = [...inicial]
  const creados: { email: string; nombre: string; rol: 'admin' }[] = []
  const repo: RepoMiembros & { creados: typeof creados } = {
    creados,
    async buscarPorEmail(email) { return miembros.find(m => m.email === email.toLowerCase()) ?? null },
    async hayAdmin() { return miembros.some(m => m.rol === 'admin' && m.activo) },
    async crear(m) {
      creados.push(m)
      const nuevo: Miembro = { id: String(miembros.length + 1), activo: true, ...m }
      miembros.push(nuevo)
      return nuevo
    },
  }
  return repo
}

describe('asegurarAdminInicial', () => {
  let repo: ReturnType<typeof repoEnMemoria>
  beforeEach(() => { repo = repoEnMemoria() })

  it('crea admin inicial si no hay admin y coincide el email (sin importar mayúsculas)', async () => {
    await asegurarAdminInicial('Papa@Gmail.com', 'papa@gmail.com', repo)
    expect(repo.creados).toEqual([{ email: 'papa@gmail.com', nombre: 'papa@gmail.com', rol: 'admin' }])
  })

  it('la variable también puede venir con mayúsculas y espacios', async () => {
    await asegurarAdminInicial('papa@gmail.com', ' Papa@Gmail.com ', repo)
    expect(repo.creados).toHaveLength(1)
  })

  it('no crea si ya hay admin', async () => {
    repo = repoEnMemoria([{ id: '1', email: 'otro@gmail.com', nombre: 'Otro', rol: 'admin', activo: true }])
    await asegurarAdminInicial('papa@gmail.com', 'papa@gmail.com', repo)
    expect(repo.creados).toEqual([])
  })

  it('no crea si el email no coincide', async () => {
    await asegurarAdminInicial('hijo@gmail.com', 'papa@gmail.com', repo)
    expect(repo.creados).toEqual([])
  })

  it('no crea si ADMIN_INICIAL_EMAIL no está definida', async () => {
    await asegurarAdminInicial('papa@gmail.com', undefined, repo)
    expect(repo.creados).toEqual([])
  })

  it('no duplica si el email ya es miembro', async () => {
    repo = repoEnMemoria([{ id: '1', email: 'papa@gmail.com', nombre: 'Papá', rol: 'miembro', activo: true }])
    await asegurarAdminInicial('papa@gmail.com', 'papa@gmail.com', repo)
    expect(repo.creados).toEqual([])
  })
})
