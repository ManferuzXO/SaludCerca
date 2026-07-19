# SaludCerca

SaludCerca es una plataforma web académica para acercar la atención municipal de salud a la ciudadanía de **La Paz, Bolivia**. Permite localizar centros, conocer disponibilidad simulada, recibir orientación inicial con IA y solicitar una ficha médica sin crear una cuenta.

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white" alt="OpenStreetMap" />
  <img src="https://img.shields.io/badge/Gemini_API-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini Developer API" />
  <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
</p>

> El asistente ofrece orientación inicial, no diagnóstico ni tratamiento. Ante señales de alarma, SaludCerca recomienda buscar atención inmediata y muestra la referencia local al 167.

## Qué puede hacer

- Explorar el catálogo de centros municipales de La Paz por nombre o servicio.
- Ver marcadores en un mapa de Leaflet con datos de OpenStreetMap.
- Compartir ubicación para ordenar centros y sugerir el más cercano disponible.
- Solicitar una ficha mediante nombres, C.I. y seguro médico, sin registro ni contraseña.
- Generar un número de ficha y consultar o cancelar reservas con el C.I.
- Mantener una sola ficha activa por paciente.
- Recibir orientación por texto o audio usando Gemini Developer API, con respuesta de voz opcional.
- Detectar señales de alerta antes de consultar la IA.
- Permitir que personal operador actualice disponibilidad, cupos y tiempo de espera de los centros.
- Usar una interfaz adaptable a PC y móvil, con tema claro/oscuro según el sistema, controles de tema, tipografía ampliada, iconos SVG y animaciones.

## Arquitectura

```mermaid
flowchart LR
  C[Ciudadanía] --> F[React + Vite]
  O[Personal operador] --> F
  F -->|HTTPS /api| B[NestJS]
  F --> M[Leaflet + OpenStreetMap]
  B --> P[(PostgreSQL + Prisma)]
  B --> S[Reglas de seguridad]
  S --> G[Gemini Developer API]
```

Consulta el detalle en [ARQUITECTURA.md](ARQUITECTURA.md).

## Tecnologías

| Área | Tecnologías |
|---|---|
| Frontend | React, TypeScript, Vite, React Leaflet |
| Backend | NestJS, TypeScript, class-validator |
| Persistencia | PostgreSQL, Prisma ORM |
| Seguridad | Hash SHA-256 de C.I.; JWT y bcryptjs para acceso de operador heredado |
| Mapa | Leaflet y OpenStreetMap |
| IA y voz | Gemini Developer API; Web Speech API como apoyo de voz del navegador |
| Despliegue | Render Blueprint, Web Service y PostgreSQL |

## Ejecución local

### 1. Frontend

```powershell
npm.cmd install
npm.cmd run dev -- --host 0.0.0.0
```

Abre `http://localhost:5173`.

### 2. Backend y base de datos

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Edita `backend/.env` con `DATABASE_URL`, `JWT_SECRET` y `GEMINI_API_KEY`. Luego:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate -- --name init
npm.cmd run db:seed
npm.cmd run start:watch
```

La API queda disponible en `http://localhost:3000/api` y su estado en `http://localhost:3000/api/health`.

## Uso desde celular

1. Conecta teléfono y computadora a la misma red Wi-Fi.
2. Inicia el frontend con `--host 0.0.0.0`.
3. Abre `http://IP-DE-TU-PC:5173` desde el teléfono.

El texto funciona en la red local. Para permisos confiables de micrófono y ubicación en móvil, usa un dominio **HTTPS**, como el despliegue de Render.

## Variables de entorno

La plantilla completa está en [backend/.env.example](backend/.env.example).

```env
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/saludcerca?schema=public"
PORT=3000
JWT_SECRET="usa-un-secreto-seguro"
AI_PROVIDER="gemini"
GEMINI_API_KEY="tu-clave"
GEMINI_CHAT_MODEL="gemini-3.1-flash-lite"
```

Nunca subas `backend/.env` ni claves reales al repositorio.

## Privacidad y alcance

- La C.I. no se almacena en texto plano: la API conserva un hash y los últimos cuatro caracteres para referencia.
- Los audios se procesan temporalmente; no se guardan como parte del flujo actual.
- Horarios, disponibilidad, cupos y stock son datos de demostración.
- Antes de uso público se debe validar información institucional, privacidad, seguridad y accesibilidad.

## Despliegue

El archivo [render.yaml](render.yaml) publica frontend y backend bajo un mismo dominio HTTPS e incluye PostgreSQL administrado. Crea un Blueprint de Render desde este repositorio e ingresa `GEMINI_API_KEY` cuando Render la solicite.

## Licencia

Proyecto académico. Define una licencia antes de distribuirlo para uso público.
