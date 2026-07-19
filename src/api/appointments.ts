import type { Center } from '../data'
import { API_URL } from './base'

export type AppointmentSlot = { id: string; service: string; startsAt: string; available: number; capacity: number }
export type Appointment = { id: string; code: string; center: string; address: string; service: string; startsAt: string; status: string }

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

export async function createAppointment(slotId: string, accessToken: string): Promise<Appointment> {
  const position = await getCurrentPosition()
  const { latitude, longitude } = position.coords
  const response = await fetch(`${API_URL}/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ slotId, latitude, longitude }) })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? 'No se pudo reservar la ficha.')
  return body as Appointment
}

export async function getMyAppointments(accessToken: string): Promise<Appointment[]> {
  const response = await fetch(`${API_URL}/appointments/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? 'No se pudieron cargar tus fichas.')
  return body as Appointment[]
}

export async function cancelAppointment(id: string, accessToken: string): Promise<Appointment> {
  const response = await fetch(`${API_URL}/appointments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? 'No se pudo cancelar la ficha.')
  return body as Appointment
}
