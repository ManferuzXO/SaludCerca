import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// La capa oficial actualmente presenta un certificado HTTPS incompleto. Se usa
// su endpoint HTTP de solo lectura para que el proceso sea reproducible tanto
// en desarrollo como en Render; los datos se validan por nombre y macrodistrito.
const sourceUrl =
  'http://sitservicios.lapaz.bo/sit/ods/mapas/Mapa_5/data/CentrosdeSalud1.js';
const apply = process.argv.includes('--apply');

type OfficialFeature = {
  properties: { nombre: string; macro: string; distrito: string; nivel: string };
  geometry: { coordinates: [number, number] };
};

const aliases: Record<string, string> = {
  villanuevapotosi: 'villanuevapotos',
  ninokollo: 'ni5okollo',
  altomariscalsantacruz: 'altomcalsantacruz',
  sanjosedenatividad: 'sanjosodenatividad',
  escobaruria: 'escobarur5a',
  asistenciapublica: 'asistenciaplblca',
  camsiquezongo: 'camsique',
  choquechihuani: 'choquechihuanihampaturi',
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/centro de salud|hospital municipal|hospital|c\.s\.m\.i\.|c\.s\.i\.|c\.m\.i\.|c\.s\.|p\.s\./g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function getOfficialFeatures(): Promise<OfficialFeature[]> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`No se pudo descargar la capa oficial (${response.status}).`);

  const script = await response.text();
  const json = script.replace(/^\s*var\s+json_CentrosdeSalud1\s*=\s*/, '').replace(/;\s*$/, '');
  return JSON.parse(json).features;
}

async function main() {
  const features = await getOfficialFeatures();
  const pending = await prisma.catalogoCentroMunicipal.findMany({
    where: { locationStatus: 'PENDING' },
    orderBy: { name: 'asc' },
  });

  const matches = pending.flatMap((center) => {
    const key = normalize(center.name);
    const expectedName = aliases[key] ?? key;
    const sameMacro = features.filter((feature) => normalize(feature.properties.macro) === normalize(center.macrodistrict));
    const found = sameMacro.filter((feature) => normalize(feature.properties.nombre) === expectedName);

    // Solo se aceptan coincidencias únicas dentro del mismo macrodistrito.
    if (found.length !== 1) return [];
    const [longitude, latitude] = found[0].geometry.coordinates;
    return [{ center, feature: found[0], latitude, longitude }];
  });

  console.table(
    matches.map(({ center, feature, latitude, longitude }) => ({
      catalogo: center.name,
      oficial: feature.properties.nombre,
      macrodistrito: center.macrodistrict,
      latitude,
      longitude,
    })),
  );
  console.log(`Coincidencias únicas y seguras: ${matches.length} de ${pending.length}.`);

  if (!apply) {
    console.log('Revisa la tabla. Para guardar solo estas coincidencias ejecuta: npm.cmd run catalog:import-official-map -- --apply');
    return;
  }

  for (const { center, feature, latitude, longitude } of matches) {
    await prisma.catalogoCentroMunicipal.update({
      where: { id: center.id },
      data: {
        latitude,
        longitude,
        locationStatus: 'VERIFIED',
        source: `GAMLP Mapa Nº 5 (2017), capa oficial: ${feature.properties.nombre}`,
        sourceUpdatedAt: new Date(),
      },
    });

    // El catálogo se transforma en centros operativos durante el seed. Al
    // verificar una ubicación posteriormente, hay que reflejarla también en
    // ese registro; de otro modo la tarjeta existe pero el marcador no aparece.
    await prisma.centroSalud.updateMany({
      where: { name: center.name },
      data: { latitude, longitude },
    });
  }

  console.log(`Se guardaron ${matches.length} coordenadas oficiales verificadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
