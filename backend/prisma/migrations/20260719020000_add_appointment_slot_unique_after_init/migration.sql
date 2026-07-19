-- AppointmentSlot ya fue creada por la migración init.
CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentSlot_serviceId_startsAt_key"
ON "AppointmentSlot"("serviceId", "startsAt");
