import { PrismaClient, StockStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { municipalCatalog } from "./data/municipal-catalog";

const prisma = new PrismaClient();

const centers = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    name: "Hospital Municipal La Paz",
    kind: "Hospital municipal",
    network: "Red municipal",
    macrodistrict: "Max Paredes",
    level: 2,
    address: "Zona 14 de Septiembre, calle Nataniel Aguirre, frente a la Plaza Garita de Lima",
    latitude: -16.49596769937952,
    longitude: -68.14581114369308,
    phone: "2454033",
    hours: "Atención según servicio",
    wait: 30,
    services: ["Medicina general", "Emergencias", "Laboratorio"],
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    name: "Hospital Municipal Los Pinos",
    kind: "Hospital municipal",
    network: "Red municipal",
    macrodistrict: "Sur",
    level: 2,
    address: "Calle 25 de Calacoto s/n, entre Muñoz Reyes y José Aguirre Acha",
    latitude: -16.54228,
    longitude: -68.07171,
    phone: "2771120",
    hours: "Atención según servicio",
    wait: 25,
    services: ["Medicina general", "Pediatría", "Laboratorio"],
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    name: "Hospital Municipal La Merced",
    kind: "Hospital municipal",
    network: "Red municipal",
    macrodistrict: "Periférica",
    level: 2,
    address: "Calle Villa Aspiazu s/n, entre Arapata y Tajma, Villa Fátima",
    latitude: -16.4897,
    longitude: -68.1172,
    phone: "2219685",
    hours: "Atención según servicio",
    wait: 18,
    services: ["Medicina general", "Pediatría", "Farmacia"],
  },
  {
    id: "a4444444-4444-4444-8444-444444444444",
    name: "Hospital Municipal La Portada",
    kind: "Hospital municipal",
    network: "Red municipal",
    macrodistrict: "Max Paredes",
    level: 2,
    address: "Avenida La Florida, zona La Portada",
    latitude: -16.48928,
    longitude: -68.1657,
    phone: "2651756",
    hours: "Atención según servicio",
    wait: 22,
    services: ["Emergencias", "Farmacia", "Laboratorio"],
  },
  {
    id: "a5555555-5555-4555-8555-555555555555",
    name: "Hospital Municipal Cotahuma",
    kind: "Hospital municipal",
    network: "Red municipal",
    macrodistrict: "Cotahuma",
    level: 2,
    address: "Avenida VÃ­ctor AgustÃ­n Ugarte y calle Jaime ZudaÃ±ez, zona Tembladerani",
    latitude: -16.51557,
    longitude: -68.13941,
    phone: "2652767",
    hours: "Atención según servicio",
    wait: 20,
    services: ["Medicina general", "Odontología", "Farmacia"],
  },
];

function simulatedStock(index: number) {
  const variants = [
    { status: StockStatus.AVAILABLE, quantity: 5 },
    { status: StockStatus.LOW, quantity: 3 },
    { status: StockStatus.OUT_OF_STOCK, quantity: 0 },
  ];
  return variants[index % variants.length];
}

async function ensureDemoSlots(centerId: string, serviceId: string) {
  for (const [dayOffset, hour, minute] of [
    [1, 9, 0],
    [1, 10, 30],
    [2, 9, 0],
  ] as const) {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + dayOffset);
    startsAt.setHours(hour, minute, 0, 0);
    await prisma.turnoFicha.upsert({
      where: { serviceId_startsAt: { serviceId, startsAt } },
      update: { capacity: 8 },
      create: { centerId, serviceId, startsAt, capacity: 8 },
    });
  }
}

// Especialidades verificadas en páginas y publicaciones oficiales de GAMLP.
// Las postas de primer nivel conservan únicamente la agenda de consulta médica
// hasta contar con su cartera individual aprobada por SEDES.
const verifiedHospitalServices: Record<string, string[]> = {
  "Hospital Municipal La Paz": [
    "Medicina general", "Traumatología", "Medicina interna", "Pediatría",
    "Cirugía general", "Gineco obstetricia", "Gastroenterología", "Fisioterapia", "Psiquiatría", "Nutrición",
  ],
  "Hospital Municipal La Merced": [
    "Medicina general", "Cardiología", "Nefrología", "Terapia física", "Psicología",
    "Nutrición", "Urología", "Traumatología", "Hemodiálisis",
  ],
  "Hospital Municipal Los Pinos": [
    "Medicina general", "Cirugía", "Pediatría", "Ginecología y obstetricia", "Odontología",
    "Laboratorio", "Rayos X", "Emergencias", "Medicina interna", "Traumatología",
    "Urología", "Cardiología", "Fisioterapia", "Hemodiálisis",
  ],
  "Hospital Municipal La Portada": ["Emergencias", "Farmacia", "Laboratorio"],
  "Hospital Municipal Cotahuma": [
    "Medicina general", "Traumatología", "Medicina interna", "Pediatría",
    "Cirugía general", "Gineco obstetricia", "Gastroenterología", "Fisioterapia", "Psiquiatría", "Nutrición",
  ],
};

// Prestaciones mínimas de referencia para el primer nivel según la norma
// nacional. La disponibilidad puntual debe confirmarse por cada centro en RUES/SEDES.
const firstLevelBaseServices = [
  "Consulta médica preventiva",
  "Control de crecimiento y desarrollo",
  "Salud sexual y reproductiva (Papanicolaou / IVAA)",
  "Educación en salud",
];

async function main() {
  for (const entry of municipalCatalog) {
    const existingCatalog = await prisma.catalogoCentroMunicipal.findUnique({ where: { name: entry.name } });
    const operationalCenter = entry.locationStatus === "VERIFIED"
      ? await prisma.centroSalud.findFirst({ where: { name: entry.name } })
      : null;
    await prisma.catalogoCentroMunicipal.upsert({
      where: { name: entry.name },
      update: {
        macrodistrict: entry.macrodistrict, district: entry.district, network: entry.network, level: entry.level,
        locationStatus: existingCatalog?.locationStatus === "VERIFIED" ? "VERIFIED" : entry.locationStatus,
        address: operationalCenter?.address ?? existingCatalog?.address ?? null,
        latitude: operationalCenter?.latitude ?? existingCatalog?.latitude ?? null,
        longitude: operationalCenter?.longitude ?? existingCatalog?.longitude ?? null,
        source: existingCatalog?.source ?? "GAMLP Anuario 2021, Anexo 4.14",
        sourceUpdatedAt: existingCatalog?.sourceUpdatedAt ?? new Date("2022-01-01"),
      },
      create: {
        name: entry.name, macrodistrict: entry.macrodistrict, district: entry.district, network: entry.network, level: entry.level,
        locationStatus: entry.locationStatus,
        address: operationalCenter?.address ?? null,
        latitude: operationalCenter?.latitude ?? null,
        longitude: operationalCenter?.longitude ?? null,
        source: "GAMLP Anuario 2021, Anexo 4.14",
        sourceUpdatedAt: new Date("2022-01-01"),
      },
    });
  }
  for (const center of centers) {
    const { wait, services, ...centerData } = center;
    await prisma.centroSalud.upsert({
      where: { id: center.id },
      update: { ...centerData, estimatedWaitMinutes: wait, isOpen: true },
      create: { ...centerData, estimatedWaitMinutes: wait, isOpen: true },
    });
    for (const name of services) {
      await prisma.servicioSalud.upsert({
        where: { centerId_name: { centerId: center.id, name } },
        update: { isActive: true },
        create: { centerId: center.id, name },
      });
    }
    await prisma.stockMedicamento.upsert({
      where: {
        centerId_medicineName: {
          centerId: center.id,
          medicineName: "Medicamentos principales",
        },
      },
      update: { status: StockStatus.AVAILABLE },
      create: {
        centerId: center.id,
        medicineName: "Medicamentos principales",
        status: StockStatus.AVAILABLE,
      },
    });
    const databaseServices = await prisma.servicioSalud.findMany({
      where: { centerId: center.id, isActive: true },
      orderBy: { name: "asc" },
    });
    for (const service of databaseServices) {
      for (const [dayOffset, hour, minute] of [
        [1, 9, 0],
        [1, 10, 30],
        [2, 9, 0],
      ] as const) {
        const startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + dayOffset);
        startsAt.setHours(hour, minute, 0, 0);
        await prisma.turnoFicha.upsert({
          where: { serviceId_startsAt: { serviceId: service.id, startsAt } },
          update: { capacity: 8 },
          create: {
            centerId: center.id,
            serviceId: service.id,
            startsAt,
            capacity: 8,
          },
        });
      }
    }
  }

  // Cada establecimiento del catálogo cuenta con una agenda y stock de prueba.
  // Los que aún no tienen coordenadas verificadas no aparecen en el mapa, pero
  // sí permiten reservar una ficha dentro de esta demostración.
  const catalogCenters = await prisma.catalogoCentroMunicipal.findMany({ orderBy: { name: "asc" } });
  for (const [index, catalog] of catalogCenters.entries()) {
    let center = await prisma.centroSalud.findFirst({ where: { name: catalog.name } });
    if (!center) {
      center = await prisma.centroSalud.create({
        data: {
          name: catalog.name,
          kind: catalog.level === 1 ? "Centro municipal" : "Hospital municipal",
          network: catalog.network,
          macrodistrict: catalog.macrodistrict,
          level: catalog.level,
          address: catalog.address ?? `Dirección por confirmar · ${catalog.macrodistrict}`,
          latitude: catalog.latitude,
          longitude: catalog.longitude,
          isOpen: true,
          estimatedWaitMinutes: 10 + (index % 4) * 5,
        },
      });
    }

    const officialServices = verifiedHospitalServices[catalog.name];
    const bookingService = officialServices?.[0] ?? firstLevelBaseServices[0];
    if (officialServices) {
      await prisma.servicioSalud.updateMany({ where: { centerId: center.id }, data: { isActive: false } });
      for (const name of officialServices) {
        await prisma.servicioSalud.upsert({
          where: { centerId_name: { centerId: center.id, name } },
          update: { isActive: true, category: "Verificado por fuente oficial GAMLP" },
          create: { centerId: center.id, name, category: "Verificado por fuente oficial GAMLP" },
        });
      }
    } else {
      await prisma.servicioSalud.updateMany({ where: { centerId: center.id }, data: { isActive: false } });
      for (const name of firstLevelBaseServices) {
        await prisma.servicioSalud.upsert({
          where: { centerId_name: { centerId: center.id, name } },
          update: { isActive: true, category: "Base normativa nacional; disponibilidad local por confirmar" },
          create: { centerId: center.id, name, category: "Base normativa nacional; disponibilidad local por confirmar" },
        });
      }
    }
    const service = await prisma.servicioSalud.findUniqueOrThrow({
      where: { centerId_name: { centerId: center.id, name: bookingService } },
    });
    const stock = simulatedStock(index);
    await prisma.stockMedicamento.upsert({
      where: { centerId_medicineName: { centerId: center.id, medicineName: "Medicamentos principales" } },
      update: stock,
      create: { centerId: center.id, medicineName: "Medicamentos principales", ...stock },
    });
    await ensureDemoSlots(center.id, service.id);
  }
  await prisma.usuario.upsert({
    where: { email: "operador@saludcerca.bo" },
    update: {
      fullName: "Operador de demostración",
      role: UserRole.OPERATOR,
      assignedCenterId: centers[0].id,
      passwordHash: await bcrypt.hash("OperadorDemo2026", 12),
    },
    create: {
      fullName: "Operador de demostración",
      email: "operador@saludcerca.bo",
      role: UserRole.OPERATOR,
      assignedCenterId: centers[0].id,
      passwordHash: await bcrypt.hash("OperadorDemo2026", 12),
    },
  });
  console.log(
    `Se habilitaron ${catalogCenters.length} centros municipales para la demostración.`,
  );
  console.log("Cuenta de operador demo: operador@saludcerca.bo");
}

main().finally(() => prisma.$disconnect());
