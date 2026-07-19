export type Center = {
  id: string | number;
  name: string;
  kind: string;
  address: string;
  distance: string;
  open: boolean;
  wait: string;
  capacity: number;
  stock: "Disponible" | "Stock bajo" | "Sin stock";
  services: string[];
  phone: string;
  hours: string;
  x: number;
  y: number;
  latitude?: number;
  longitude?: number;
  isOperational?: boolean;
  locationStatus?: "VERIFIED" | "PENDING";
  macrodistrict?: string;
};

export const centers: Center[] = [
  {
    id: 1,
    name: "Centro de Salud San Pedro",
    kind: "Centro municipal",
    address: "Av. 6 de Agosto y Ecuador",
    distance: "0,8 km",
    open: true,
    wait: "18 min",
    capacity: 7,
    stock: "Disponible",
    services: ["Medicina general", "Odontología", "Farmacia"],
    phone: "2 244 8120",
    hours: "Lun–Vie · 07:00–19:00",
    x: 52,
    y: 44,
  },
  {
    id: 2,
    name: "Hospital Municipal La Paz",
    kind: "Hospital",
    address: "Av. Simón Bolívar 1920",
    distance: "1,4 km",
    open: true,
    wait: "32 min",
    capacity: 12,
    stock: "Disponible",
    services: ["Emergencias 24 h", "Pediatría", "Laboratorio"],
    phone: "2 245 7930",
    hours: "Abierto las 24 horas",
    x: 68,
    y: 27,
  },
  {
    id: 3,
    name: "Posta Villa Fátima",
    kind: "Posta sanitaria",
    address: "Calle 12, Villa Fátima",
    distance: "2,1 km",
    open: true,
    wait: "9 min",
    capacity: 3,
    stock: "Stock bajo",
    services: ["Medicina general", "Vacunación", "Farmacia"],
    phone: "2 221 4498",
    hours: "Lun–Vie · 08:00–16:00",
    x: 29,
    y: 66,
  },
  {
    id: 4,
    name: "Centro de Salud Miraflores",
    kind: "Centro municipal",
    address: "Av. Busch 870",
    distance: "2,8 km",
    open: false,
    wait: "Cierra a las 18:00",
    capacity: 0,
    stock: "Disponible",
    services: ["Ginecología", "Medicina familiar"],
    phone: "2 224 7731",
    hours: "Lun–Vie · 07:30–18:00",
    x: 77,
    y: 70,
  },
];
