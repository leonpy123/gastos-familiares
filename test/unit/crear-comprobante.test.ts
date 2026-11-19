import { describe, it, expect, beforeEach } from 'vitest'
import { crearComprobante, type RepoComprobantes } from '../../server/utils/crear-comprobante'
import type { BorradorComprobante, Tipo } from '../../shared/types'

const tipos: Tipo[] = [{ id: 't-hogar', clase: 'gasto', nombre: 'Gastos hogar', palabras_clave: ['hogar'], activo: true }]
const b: BorradorComprobante = {
  id: '10000000-0000-4000-8000-000000000001', clase: 'gasto', fecha: '2026-11-19', tipoId: 't-hogar',
  concepto: 'almuerzo', contraparte: 'supermas', ruc: '8002147', monto: 8000,
}

function repoEnMemoria() {
  const insertados: (BorradorComprobante & { rucDv: number })[] = []
  const repo: RepoComprobantes & { insertados: typeof insertados } = {
    insertados,
    async buscar(id) { return insertados.find(c => c.id === id) ? { id } : null },
    async insertar(c) {
      if (insertados.some(x => x.id === c.id)) return 'duplicado'
      insertados.push(c)
      return 'insertado'
    },
  }
  return repo
}

describe('crearComprobante', () => {
  let repo: ReturnType<typeof repoEnMemoria>
  let deps: Parameters<typeof crearComprobante>[1]
  beforeEach(() => {
    repo = repoEnMemoria()
    deps = { repo, tipos, sincronizar: async () => ({ ok: true }) }
  })

  it('inválido no inserta', async () => {
    expect(await crearComprobante({ ...b, monto: 0 }, deps)).toEqual({ estado: 'invalido', errores: ['Monto inválido.'] })
    expect(repo.insertados).toHaveLength(0)
  })

  it('id que no es UUID se rechaza', async () => {
    expect(await crearComprobante({ ...b, id: 'abc' }, deps)).toMatchObject({ estado: 'invalido' })
  })

  it('inserta con DV calculado y sincroniza', async () => {
    expect(await crearComprobante(b, deps)).toEqual({ estado: 'creado', planilla: 'ok' })
    expect(repo.insertados[0]!.rucDv).toBe(6)
  })

  it('doble envío del mismo id inserta una sola vez', async () => {
    await crearComprobante(b, deps)
    expect(await crearComprobante(b, deps)).toMatchObject({ estado: 'existente' })
    expect(repo.insertados).toHaveLength(1)
  })

  it('carrera: la base informa duplicado al insertar', async () => {
    repo.buscar = async () => null
    await crearComprobante(b, deps)
    expect(await crearComprobante(b, deps)).toMatchObject({ estado: 'existente' })
    expect(repo.insertados).toHaveLength(1)
  })

  it('si la planilla falla igual se guarda', async () => {
    deps.sincronizar = async () => ({ ok: false })
    expect(await crearComprobante(b, deps)).toEqual({ estado: 'creado', planilla: 'pendiente' })
    expect(repo.insertados).toHaveLength(1)
  })

  it('normaliza RUC y recorta textos antes de guardar', async () => {
    await crearComprobante({ ...b, ruc: '8.002.147', concepto: '  a ', contraparte: ' Supermas ' }, deps)
    expect(repo.insertados[0]).toMatchObject({ ruc: '8002147', concepto: 'a', contraparte: 'Supermas' })
  })
})
