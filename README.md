# NexaPay Backend

API de **NexaPay**, una billetera digital multimoneda (USD, EUR, COP, ARS). Este repositorio contiene el **backend**; la interfaz web está en [`nexapay-frontend`](https://github.com/lNexapay/nexapay-frontend).

## Qué incluye hoy

| Módulo | Estado | Detalle |
|--------|--------|---------|
| **Autenticación** | Funcional | Registro (crea también la billetera), login con JWT, refresh tokens, cierre de sesión, control de actividad y ruta protegida `/me` |
| **Monedas y tasas** | Funcional | Catálogo de monedas y tasas de cambio de ejemplo |
| **Saldos (wallet)** | En desarrollo | Lógica de saldos y conversión implementada sobre un almacén **en memoria** (`src/data/wallet.store.ts`); aún sin endpoints ni conexión a la base de datos |
| **Transacciones** | Pendiente | Archivos de estructura creados; la tabla ya existe en las migraciones |
| **Documentación de la API** | Funcional | Swagger UI en `/api-docs` |

## Stack

- Node.js + TypeScript
- Express 5
- PostgreSQL (`pg`) con migraciones SQL (`node-pg-migrate`)
- JWT (`jsonwebtoken`) y `bcrypt` para contraseñas
- Swagger (`swagger-jsdoc` + `swagger-ui-express`)
- Pruebas con Vitest y Supertest

## Requisitos

- Node.js 20 o superior
- PostgreSQL 13 o superior (las migraciones usan `gen_random_uuid()`)
- Git

## Inicio rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/lNexapay/nexapay-backend.git
cd nexapay-backend
npm install

# 2. Variables de entorno
cp .env.example .env
# Edita .env (ver tabla más abajo)

# 3. Crear las tablas
npm run migrate:up

# 4. Iniciar en modo desarrollo
npm run dev
```

El servidor queda en `http://localhost:3000`. Comprueba que responde en `http://localhost:3000/api/health`.

### PostgreSQL con Docker (opcional)

```bash
docker run --name nexapay-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=nexapay -p 5432:5432 -d postgres:16
```

Con eso, `DATABASE_URL=postgres://postgres:postgres@localhost:5432/nexapay`.

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgres://postgres:postgres@localhost:5432/nexapay` |
| `JWT_SECRET` | Clave para firmar los tokens. Usa un valor largo y aleatorio | `cambia-esto-por-un-secreto-largo` |
| `FRONTEND_URL` | Origen del frontend permitido por CORS además de `http://localhost:5173` (por ejemplo, el dominio de Vercel) | `https://nexapay.vercel.app` |

El archivo `.env` **nunca se sube a Git**.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con recarga automática (`tsx watch`) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la versión compilada (`dist/server.js`) |
| `npm test` | Ejecuta las pruebas una vez |
| `npm run test:watch` | Pruebas en modo observación |
| `npm run migrate:up` | Aplica las migraciones pendientes |

## Endpoints

Documentación interactiva: **`http://localhost:3000/api-docs`**.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Estado de la API |
| `POST` | `/api/auth/register` | No | Crea usuario y su billetera |
| `POST` | `/api/auth/login` | No | Inicia sesión |
| `POST` | `/api/auth/refresh` | Cookie | Renueva la sesión |
| `POST` | `/api/auth/logout` | Cookie | Cierra la sesión |
| `POST` | `/api/auth/activity` | Sí | Registra actividad de la sesión |
| `GET` | `/api/auth/me` | Sí | Datos del usuario autenticado |
| `GET` | `/api/currencies` | No | Monedas disponibles |
| `GET` | `/api/rates` | No | Tasas de cambio |

Las rutas protegidas esperan la cabecera `Authorization: Bearer <token>`. El refresh token viaja en una cookie `HttpOnly` (`refreshToken`), por eso el frontend debe hacer las peticiones con `credentials: "include"`.

> Los errores de wallet los gestiona el middleware `errorHandler` (`AppError`); los de auth responden hoy con su propio formato. Unificarlos queda pendiente.

> CORS permite con credenciales el origen `http://localhost:5173` (desarrollo) y el definido en `FRONTEND_URL` (frontend desplegado, por ejemplo en Vercel).

## Base de datos

Las migraciones están en `migrations/` y se aplican en orden:

| # | Tabla / cambio |
|---|----------------|
| 001 | `users` |
| 002 | `wallets` (una por usuario) |
| 003 | `balances` |
| 004 | `contexts` |
| 005 | `transactions` |
| 006 | `context_budgets` |
| 007 | `exchange_rates_cache` |
| 008 | `refresh_tokens` |
| 009 | `last_activity` en `refresh_tokens` |

Reglas: no edites una migración que ya está en `main` (crea una nueva) e incluye la migración en el mismo PR que el código que la necesita.

## Estructura

```
.
├── migrations/        # Migraciones SQL
├── src/
│   ├── server.ts      # Arranque del servidor
│   ├── app.ts         # Express, CORS, rutas y manejo de errores
│   ├── auth/          # Registro, login, JWT, refresh tokens
│   ├── config/        # Base de datos y catálogo de monedas
│   ├── controllers/   # Traducen HTTP a servicios
│   ├── services/      # Lógica de negocio (saldos, monedas, transacciones)
│   ├── routes/        # Definición de endpoints (con anotaciones Swagger)
│   ├── data/          # Almacén en memoria de la wallet (temporal)
│   ├── middlewares/   # errorHandler
│   ├── docs/          # Configuración de Swagger
│   ├── types/         # Tipos de la wallet
│   └── utils/         # AppError y validadores
└── test/              # Pruebas de rutas y servicios
```

## Cómo trabajamos

1. Crea una rama desde `main`: `feat/...`, `fix/...`, `docs/...`.
2. Commits claros, por ejemplo `feat(wallet): agrega conversión de monedas`.
3. Abre un Pull Request hacia `main` y pide revisión.
4. Antes de abrirlo, verifica en local:

```bash
npx tsc --noEmit
npm test
```

No subas `.env`, llaves ni datos reales.

## Pendientes conocidos

- Conectar la wallet (saldos y transacciones) a PostgreSQL y retirar el almacén en memoria.
- Exponer los endpoints de saldos y transacciones.
- Completar las pruebas marcadas como `todo` en `test/`.
- Definir la licencia (el `package.json` declara `ISC` por defecto).
