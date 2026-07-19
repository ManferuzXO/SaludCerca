import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { writeFile } from 'node:fs/promises'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type NominatimResult = { lat: string; lon: string; display_name: string; name?: string; type: string; class: string }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/c\.s\.i\.|c\.s\.m\.i\.|c\.s\.|p\.s\.|centro de salud|hospital municipal|hospital/g, '').replace(/[^a-z0-9]/g, ' ').trim()

async function findCandidate(name: string, macrodistrict: string) {
  const query = `${name}, ${macrodistrict}, La Paz, Bolivia`
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=bo&q=${encodeURIComponent(query)}`
  const response = await fetch(url, { headers: { 'User-Agent': 'SaludCerca-Academic/1.0 (geocoding municipal catalog)' } })
  if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`)
  const results = await response.json() as NominatimResult[]
  const expected = normalize(name).split(' ').filter((word) => word.length >= 4)
  return results.find((item) => {
    const actual = normalize(item.name ?? item.display_name)
    return item.display_name.toLowerCase().includes('municipio nuestra señora de la paz')
      && ['hospital', 'clinic', 'doctors'].includes(item.type)
      && expected.some((word) => actual.includes(word))
  }) ?? null
}

async function main() {
  if (apply) throw new Error('La aplicación automática está deshabilitada: revisa primero geocoding-report.json y carga únicamente coordenadas confirmadas.')
  const pending = await prisma.catalogoCentroMunicipal.findMany({ where: { locationStatus: 'PENDING' }, orderBy: [{ macrodistrict: 'asc' }, { name: 'asc' }] })
  const report: Array<{ id: string; name: string; status: string; candidate?: NominatimResult | null; error?: string }> = []
  for (const center of pending) {
    try {
      const candidate = await findCandidate(center.name, center.macrodistrict)
      report.push({ id: center.id, name: center.name, status: candidate ? 'CANDIDATE' : 'NOT_FOUND', candidate })
    } catch (error) {
      report.push({ id: center.id, name: center.name, status: 'ERROR', error: error instanceof Error ? error.message : 'Error desconocido' })
    }
    await delay(1100)
  }
  await writeFile('prisma/geocoding-report.json', JSON.stringify({ generatedAt: new Date().toISOString(), apply, report }, null, 2))
  console.log(`Procesados ${pending.length} centros. Reporte: prisma/geocoding-report.json`)
}

main().finally(() => prisma.$disconnect())
