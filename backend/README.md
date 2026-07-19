# SaludCerca API

API REST de SaludCerca para centros municipales de La Paz, fichas rápidas por C.I., disponibilidad operativa y orientación inicial asistida por IA.

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Gemini_API-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini Developer API" />
</p>

> El asistente orienta, no diagnostica ni prescribe. Las señales de alerta se evalúan antes de llamar al modelo generativo.

## Capacidades

- Catálogo de centros, servicios, turnos, cupos, espera y stock simulado.
- Reserva de ficha sin cuenta con nombre, C.I. y seguro médico.
- C.I. protegida mediante SHA-256; no se persiste en texto plano.
- Consulta y cancelación de fichas por C.I.; una ficha activa por paciente.
- JWT, bcryptjs y roles para operaciones de personal.
- Auditoría de cambios de disponibilidad.
- Chat Gemini, transcripción de audio y respuesta de voz opcional.
- DTOs validados globalmente con `class-validator`.

## Inicio rápido

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Completa `DATABASE_URL`, `JWT_SECRET` y `GEMINI_API_KEY` en `.env`:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate -- --name init
npm.cmd run db:seed
npm.cmd run start:watch
```

La API está disponible en `http://localhost:3000/api` y la prueba de estado en `GET /api/health`.

## Variables de entorno

```env
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/saludcerca?schema=public"
PORT=3000
JWT_SECRET="usa-un-secreto-seguro"
AI_PROVIDER="gemini"
GEMINI_API_KEY="tu-clave"
GEMINI_CHAT_MODEL="gemini-3.1-flash-lite"
GEMINI_AUDIO_MODEL="gemini-3.5-flash"
GEMINI_TTS_MODEL="gemini-2.5-flash-preview-tts"
```

No subas `.env` ni claves reales a GitHub.

## Scripts

| Comando | Uso |
|---|---|
| `npm.cmd run start:watch` | API NestJS con recarga automática. |
| `npm.cmd run start:dev` | Compila e inicia la API. |
| `npm.cmd run build` | Compila NestJS en `dist/`. |
| `npm.cmd run db:generate` | Genera Prisma Client. |
| `npm.cmd run db:migrate -- --name nombre` | Crea y aplica una migración local. |
| `npm.cmd run db:deploy` | Aplica migraciones existentes, útil en Render. |
| `npm.cmd run db:seed` | Carga catálogo y datos demostrativos de forma idempotente. |
| `npm.cmd run db:studio` | Abre Prisma Studio. |
| `npm.cmd run catalog:geocode` | Herramienta de revisión de coordenadas del catálogo. |

## Endpoints

El prefijo global es `/api`.

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| `GET` | `/health` | Estado de la API. | Público |
| `GET` | `/centers` | Lista y filtra centros. | Público |
| `GET` | `/centers/:id` | Detalle de un centro. | Público |
| `GET` | `/centers/:id/availability` | Cupos, espera y stock. | Público |
| `GET` | `/centers/:id/slots` | Horarios disponibles. | Público |
| `PATCH` | `/centers/:id/availability` | Cambia apertura, cupos o espera. | Operador con JWT |
| `POST` | `/appointments` | Crea una ficha para paciente. | Público |
| `POST` | `/appointments/history` | Consulta fichas con C.I. | Público |
| `POST` | `/appointments/:id/cancel` | Cancela ficha con C.I. | Público |
| `POST` | `/assistant/chat` | Orientación por texto. | Público |
| `POST` | `/assistant/transcribe` | Transcripción de audio. | Público |
| `POST` | `/assistant/speak` | Audio opcional para una respuesta. | Público |
| `POST` | `/auth/login` | Acceso de personal. | Público |

`GET /appointments/me` y `DELETE /appointments/:id` se mantienen para el flujo JWT heredado.

## Modelo de datos

Prisma administra `Paciente`, `Ficha`, `CentroSalud`, `ServicioSalud`, `TurnoFicha`, `StockMedicamento`, `AuditoriaDisponibilidad`, `CatalogoCentroMunicipal` y `Usuario`.

Las migraciones están en [`prisma/migrations`](prisma/migrations) y la definición completa en [`prisma/schema.prisma`](prisma/schema.prisma).

## Despliegue

Render usa el [archivo de configuración principal](../render.yaml) para construir el frontend y esta API en un solo servicio HTTPS con PostgreSQL. Define `GEMINI_API_KEY` como secreto en Render. En producción, restringe CORS, configura monitoreo y valida requisitos institucionales de privacidad antes de usar datos reales.

Consulta también el [README principal](../README.md) y [ARQUITECTURA.md](../ARQUITECTURA.md).
