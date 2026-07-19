-- Los centros sin coordenada publicada siguen habilitados para la simulación
-- de fichas, pero no se dibujan en el mapa hasta verificar su ubicación.
ALTER TABLE "HealthCenter" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "HealthCenter" ALTER COLUMN "longitude" DROP NOT NULL;
