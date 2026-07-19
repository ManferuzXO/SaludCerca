import type { Center } from "../data";
import { API_URL } from "./base";

type ApiCenter = {
  id: string;
  name: string;
  kind: string;
  address: string;
  phone: string | null;
  hours: string | null;
  open: boolean;
  wait: string;
  stock: Center["stock"];
  services: string[];
  coordinates: { latitude: number; longitude: number } | null;
  isOperational: boolean;
  locationStatus: "VERIFIED" | "PENDING";
  macrodistrict: string | null;
};

type Availability = {
  appointments: { available: number; estimatedWait: string };
  medicines: { status: Center["stock"]; updatedAt: string };
};

function mapPosition(latitude: number, longitude: number) {
  // El mapa actual es ilustrativo. Azure Maps reemplazará esta conversión al integrar rutas reales.
  const x = Math.min(84, Math.max(18, 50 + (longitude + 68.13) * 360));
  const y = Math.min(78, Math.max(19, 50 - (latitude + 16.5) * 680));
  return { x, y };
}

export async function getCenters(
  filters: { query?: string; service?: string } = {},
): Promise<Center[]> {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.service && filters.service !== "Todos los servicios")
    params.set("service", filters.service);
  const response = await fetch(`${API_URL}/centers?${params.toString()}`);
  if (!response.ok)
    throw new Error("No se pudo obtener la información de los centros.");
  const centers: ApiCenter[] = await response.json();
  return centers.map((center) => ({
    id: center.id,
    name: center.name,
    latitude: center.coordinates?.latitude,
    longitude: center.coordinates?.longitude,
    kind: center.kind,
    address: center.address,
    distance: "Ver ruta",
    open: center.open,
    wait: center.wait,
    capacity: 0,
    stock: center.stock,
    services: center.services,
    phone: center.phone ?? "Sin teléfono registrado",
    hours: center.hours ?? "Horario por confirmar",
    ...(center.coordinates ? mapPosition(center.coordinates.latitude, center.coordinates.longitude) : { x: 50, y: 50 }),
    isOperational: center.isOperational,
    locationStatus: center.locationStatus,
    macrodistrict: center.macrodistrict ?? undefined,
  }));
}

export async function getCenterAvailability(
  id: Center["id"],
): Promise<Availability> {
  const response = await fetch(`${API_URL}/centers/${id}/availability`);
  if (!response.ok)
    throw new Error("No se pudo obtener la disponibilidad del centro.");
  return response.json();
}

export async function updateCenterAvailability(
  id: Center["id"],
  update: { capacity: number; wait: string; stock: Center["stock"] },
  accessToken: string,
): Promise<Availability> {
  const response = await fetch(`${API_URL}/centers/${id}/availability`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(update),
  });
  if (!response.ok) throw new Error("No se pudo guardar la actualización.");
  return response.json();
}
