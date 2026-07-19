# SaludCerca

SaludCerca es una plataforma web para orientar a la ciudadanía de **La Paz, Bolivia**, hacia centros de salud municipales. Permite buscar establecimientos, ubicarlos en un mapa, consultar disponibilidad simulada, reservar una ficha médica y recibir orientación inicial segura mediante texto o voz.

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma ORM" />
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white" alt="OpenStreetMap" />
  <img src="https://img.shields.io/badge/Gemini_API-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini Developer API" />
  <img src="https://img.shields.io/badge/License-Acad%C3%A9mico-0F766E?style=for-the-badge" alt="Proyecto académico" />
</p>

> La orientación del asistente no reemplaza una evaluación médica, no realiza diagnósticos ni indica tratamientos. Ante una emergencia, se debe buscar atención inmediata; en La Paz se muestra la referencia al **167**.

## Funcionalidades

- Catálogo de centros de salud municipales de La Paz, con macrodistrito, red, nivel, servicios y datos de contacto cuando están disponibles.
- Mapa interactivo con **Leaflet** y **OpenStreetMap**.
- Búsqueda, filtros y recomendación del centro más cercano al compartir la ubicación.
- Registro e inicio de sesión de ciudadanos.
- Reserva y cancelación de una ficha médica; el ciudadano mantiene una sola ficha activa.
- Consulta de fichas reservadas desde la cuenta ciudadana.
- Panel de operador para actualizar cupos, tiempo de espera y estado de disponibilidad del centro asignado.
- Stock de medicamentos simulado para fines de demostración.
- Asistente de orientación con **Gemini Developer API**: texto, transcripción de audio y respuesta de voz opcional.
- Reglas de alerta previas a la IA para derivar situaciones urgentes sin intentar diagnosticarlas.

## Arquitectura

```mermaid
flowchart LR
  C[Ciudadano] --> F[React + Vite]
  O[Operador] --> F
  F -->|HTTPS / API| B[NestJS]
  B --> P[(PostgreSQL + Prisma)]
  B --> G[Gemini Developer API]
  F --> M[Leaflet + OpenStreetMap]
```

La descripción técnica completa está en [ARQUITECTURA.md](ARQUITECTURA.md).

## Tecnologías

<p align="center">
  <a href="https://react.dev/" title="React"><img src="https://skillicons.dev/icons?i=react" height="52" alt="React" /></a>
  <a href="https://www.typescriptlang.org/" title="TypeScript"><img src="https://skillicons.dev/icons?i=ts" height="52" alt="TypeScript" /></a>
  <a href="https://vite.dev/" title="Vite"><img src="https://skillicons.dev/icons?i=vite" height="52" alt="Vite" /></a>
  <a href="https://nestjs.com/" title="NestJS"><img src="https://skillicons.dev/icons?i=nestjs" height="52" alt="NestJS" /></a>
  <a href="https://nodejs.org/" title="Node.js"><img src="https://skillicons.dev/icons?i=nodejs" height="52" alt="Node.js" /></a>
  <a href="https://www.postgresql.org/" title="PostgreSQL"><img src="https://skillicons.dev/icons?i=postgres" height="52" alt="PostgreSQL" /></a>
  <a href="https://www.prisma.io/" title="Prisma"><img src="https://skillicons.dev/icons?i=prisma" height="52" alt="Prisma" /></a>
  <a href="https://leafletjs.com/" title="Leaflet"><img src="https://skillicons.dev/icons?i=leaflet" height="52" alt="Leaflet" /></a>
  <a href="https://git-scm.com/" title="Git"><img src="https://skillicons.dev/icons?i=git" height="52" alt="Git" /></a>
</p>

| Capa | Tecnología |
|---|---|
| Frontend | React, TypeScript, Vite, React Leaflet |
| Backend | NestJS, TypeScript, class-validator |
| Base de datos | PostgreSQL, Prisma ORM |
| Autenticación | JWT y bcryptjs |
| Mapas | Leaflet y OpenStreetMap |
| IA y voz | Gemini Developer API |

## Requisitos

- Node.js 20 o superior.
- PostgreSQL local o remoto.
- Una clave de Gemini Developer API si se utilizará el asistente.

## Instalación local

### 1. Frontend

```powershell
npm.cmd install
npm.cmd run dev -- --host 0.0.0.0
```

El frontend se abrirá normalmente en `http://localhost:5173`.

### 2. Backend

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Edita `backend/.env` con tu conexión PostgreSQL, una clave JWT segura y tu `GEMINI_API_KEY`. Nunca subas este archivo al repositorio.

Luego crea las tablas, carga los datos de demostración e inicia la API:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate -- --name init
npm.cmd run db:seed
npm.cmd run start:dev
```

La API estará disponible en `http://localhost:3000/api` y su comprobación de estado en `http://localhost:3000/api/health`.

## Uso desde un teléfono en la red local

1. Conecta el teléfono y la computadora a la misma red Wi-Fi.
2. Inicia frontend con `--host 0.0.0.0` y backend en el puerto `3000`.
3. Abre en el teléfono `http://IP-DE-TU-COMPUTADORA:5173`.

El chat de texto puede funcionar con HTTP local. Para permisos de **micrófono** y **ubicación precisa** en dispositivos móviles, los navegadores exigen una dirección HTTPS; usa un despliegue o un túnel HTTPS para probar esas funciones.

## Variables de entorno

Las variables requeridas y opcionales están documentadas en [backend/.env.example](backend/.env.example).

Variables principales:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/saludcerca?schema=public"
PORT=3000
JWT_SECRET="cambia-esto-por-un-secreto-seguro"
AI_PROVIDER="gemini"
GEMINI_API_KEY="tu-clave"
GEMINI_CHAT_MODEL="gemini-3.1-flash-lite"
```

## Endpoints principales

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/health` | Comprueba que la API esté activa. |
| `POST` | `/api/auth/register` | Registra una cuenta ciudadana. |
| `POST` | `/api/auth/login` | Inicia sesión. |
| `GET` | `/api/centers` | Lista y filtra centros de salud. |
| `GET` | `/api/centers/:id/availability` | Consulta cupos, espera y stock. |
| `POST` | `/api/appointments` | Reserva una ficha autenticada. |
| `GET` | `/api/appointments/me` | Obtiene las fichas del ciudadano. |
| `POST` | `/api/assistant/chat` | Envía una consulta de orientación. |
| `POST` | `/api/assistant/transcribe` | Transcribe audio enviado por el usuario. |
| `POST` | `/api/assistant/speak` | Genera una respuesta de voz opcional. |

## Datos y alcance

El catálogo reúne centros municipales para la demostración. La disponibilidad, los horarios, los cupos y el stock mostrados son simulados; deben validarse con la autoridad sanitaria correspondiente antes de un uso público real. Las coordenadas que estén marcadas como pendientes requieren verificación adicional.

## Seguridad y privacidad

- `.env`, credenciales, dependencias y archivos compilados están excluidos mediante `.gitignore`.
- La API de Gemini se usa únicamente desde el backend; la clave no se expone al navegador.
- Los audios se procesan para transcripción y no se persisten como parte de la aplicación.
- Las reservas requieren autenticación y los cambios operativos requieren el rol de operador asignado al centro.

## Despliegue

Un repositorio GitHub guarda el código, pero no ejecuta el sistema. Para publicarlo se requiere desplegar por separado el frontend, el backend y PostgreSQL, y configurar allí las variables de entorno. El dominio público debe usar HTTPS para que voz y geolocalización funcionen correctamente en móviles.

## Licencia

Proyecto académico. Define una licencia antes de distribuirlo para uso público.
#   S a l u d C e r c a  
 