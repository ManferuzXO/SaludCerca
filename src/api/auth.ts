import { API_URL } from './base'
const SESSION_KEY = 'saludcerca_session'

export type Session = { accessToken: string; user: { id: string; fullName: string; email: string; role: 'CITIZEN' | 'OPERATOR' | 'ADMIN'; assignedCenterId?: string | null } }

export function getSession(): Session | null {
  try { const value = localStorage.getItem(SESSION_KEY); return value ? JSON.parse(value) as Session : null } catch { return null }
}

export function clearSession() { localStorage.removeItem(SESSION_KEY) }

export async function login(email: string, password: string): Promise<Session> {
  const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? 'No se pudo iniciar sesión.')
  localStorage.setItem(SESSION_KEY, JSON.stringify(body))
  return body as Session
}

export async function register(fullName: string, email: string, password: string): Promise<Session> {
  const response = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName, email, password }) })
  const body = await response.json()
  if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message ?? 'No se pudo crear la cuenta.')
  localStorage.setItem(SESSION_KEY, JSON.stringify(body))
  return body as Session
}
