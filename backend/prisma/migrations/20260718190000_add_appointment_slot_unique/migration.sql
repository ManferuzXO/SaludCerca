-- Esta migración fue creada antes de la migración inicial, por lo que en una
-- base de datos nueva AppointmentSlot todavía no existe. Se conserva como
-- compatibilidad para instalaciones antiguas y no hace nada hasta que la tabla
-- esté disponible. El índice se crea para instalaciones nuevas en la migración
-- posterior a init.
DO $$
BEGIN
  IF to_regclass('"AppointmentSlot"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname = 'AppointmentSlot_serviceId_startsAt_key'
    ) THEN
    CREATE UNIQUE INDEX "AppointmentSlot_serviceId_startsAt_key"
    ON "AppointmentSlot"("serviceId", "startsAt");
  END IF;
END $$;
