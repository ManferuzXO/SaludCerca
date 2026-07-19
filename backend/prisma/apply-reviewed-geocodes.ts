import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Estas coordenadas se aplican únicamente después de revisar el reporte de
// geocodificación. No se deben añadir resultados automáticos sin validar.
const reviewedLocations = [
  {
    id: '3316207a-54e4-49ed-be0a-c0ba771606eb',
    address: 'Calle Damas de Cotagaita, El Tejar, Max Paredes, La Paz',
    latitude: -16.4975278,
    longitude: -68.1560009,
    source: 'OpenStreetMap way 1083925341; coincidencia nominal y territorial revisada',
  },
];

async function main() {
  for (const location of reviewedLocations) {
    const center = await prisma.catalogoCentroMunicipal.update({
      where: { id: location.id },
      data: {
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        locationStatus: 'VERIFIED',
        source: location.source,
        sourceUpdatedAt: new Date(),
      },
      select: { name: true, latitude: true, longitude: true, locationStatus: true },
    });

    console.log(`Ubicación verificada aplicada: ${center.name}`, center);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
