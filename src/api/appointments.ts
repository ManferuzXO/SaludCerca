import type { Center } from '../data'
import { API_URL } from './base'

export type AppointmentSlot = { id: string; service: string; startsAt: string; available: number; capacity: number }
export type Appointment = { id: string; code: string; center: string; address: string; service: string; startsAt: string; status: string }
export type PatientAccess = { ci: string }
export type PatientData = PatientAccess & { fullName: string; insuranceProvider: string }

export const INSURANCE_PROVIDERS = [
  'Sin seguro / Sistema Único de Salud (SUS)',
  'Caja Nacional de Salud (CNS)',
  'Caja Petrolera de Salud',
  'Caja de Salud de la Banca Privada',
  'Caja Bancaria Estatal de Salud',
  'Caja de Salud CORDES',
  'Caja de Salud de Caminos',
  'Corporación del Seguro Social Militar (COSSMIL)',
  'Seguro Social Universitario La Paz',
  'Otro ente gestor de salud',
] as const

export async function getAppointmentSlots(centerId: Center['id']): Promise<AppointmentSlot[]> {
  const response = await fetch(`${API_URL}/centers/${centerId}/slots`)
  if (!response.ok) throw new Error('No se pudieron cargar los horarios disponibles.')
  return response.json()
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Tu navegador no permite obtener la ubicación.')); return }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Permite tu ubicación para reservar en el centro más cercano.')), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 })
  })
}

async function readBody(response: Response) {
  const body = await response.json()
  if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message ?? 'No se pudo completar la solicitud.')
  return body
}

export async function createAppointment(slotId: string, patient: PatientData): Promise<Appointment> {
  const position = await getCurrentPosition()
  const response = await fetch(`${API_URL}/appointments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId, latitude: position.coords.latitude, longitude: position.coords.longitude, ...patient }),
  })
  return readBody(response) as Promise<Appointment>
}

export async function getPatientAppointments(access: PatientAccess): Promise<Appointment[]> {
  const response = await fetch(`${API_URL}/appointments/history`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(access),
  })
  return readBody(response) as Promise<Appointment[]>
}

export async function cancelPatientAppointment(id: string, access: PatientAccess): Promise<Appointment> {
  const response = await fetch(`${API_URL}/appointments/${id}/cancel`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(access),
  })
  return readBody(response) as Promise<Appointment>
}

// Compatibilidad temporal para el panel heredado de cuentas de demostración.
export async function getMyAppointments(accessToken: string): Promise<Appointment[]> {
  const response = await fetch(`${API_URL}/appointments/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
  return readBody(response) as Promise<Appointment[]>
}
export async function cancelAppointment(id: string, accessToken: string): Promise<Appointment> {
  const response = await fetch(`${API_URL}/appointments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
  return readBody(response) as Promise<Appointment>
}
