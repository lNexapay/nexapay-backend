# Arquitectura (backend)

Describe cómo está organizado el backend **hoy** y hacia dónde conviene llevarlo. Si el equipo acuerda algo distinto, regístralo en un [ADR](adr/README.md) y actualiza este archivo.

## Visión general

```
┌──────────────┐   HTTP/JSON    ┌──────────────────────┐    SQL     ┌────────────┐
│  Frontend    │ ─────────────▶ │  Backend (Express)   │ ─────────▶ │ PostgreSQL │
│  (React/Vite)│ ◀───────────── │  Node.js + TypeScript│ ◀───────── │            │
└──────────────┘  + cookie de   └──────────────────────┘            └────────────┘
                    sesión
```

- El **frontend** consume la API por HTTP con JSON y envía la cookie de sesión (`credentials: "include"`).
- El **backend** valida la petición, aplica la lógica de negocio y consulta PostgreSQL con `pg`.
- El esquema se versiona con **migraciones SQL** (`node-pg-migrate`). Ver [database.md](database.md).

## Estructura actual de `src/`

```
src/
├── server.ts            # Arranque: carga dotenv y levanta el servidor
├── app.ts               # Express: CORS, JSON, rutas, Swagger y errorHandler
├── auth/                # Módulo de autenticación (autocontenido)
│   ├── auth.routes.ts       # Endpoints /api/auth/*
│   ├── auth.controller.ts   # Lee req/res y responde
│   ├── auth.service.ts      # Registro, login y emisión de JWT
│   ├── refresh-token.service.ts  # Sesiones y refresh tokens
│   └── auth.middleware.ts   # Protege rutas (JWT + sesión activa)
├── config/
│   ├── database.ts      # Pool de conexión a PostgreSQL
│   └── currencies.ts    # Catálogo de monedas (USD, EUR, COP, ARS) y tasas de ejemplo
├── routes/              # Endpoints de wallet (con anotaciones Swagger)
├── controllers/         # Traducen HTTP ↔ servicios
├── services/            # Lógica de negocio (saldos, monedas, transacciones)
├── data/
│   └── wallet.store.ts  # Almacén EN MEMORIA de la wallet (temporal)
├── middlewares/
│   └── errorHandler.ts  # Convierte AppError en respuesta JSON
├── docs/swagger.ts      # Configuración de Swagger (/api-docs)
├── types/               # Tipos de la wallet
└── utils/               # AppError y validadores
```

Montaje en `app.ts`:

| Prefijo | Qué sirve |
|---------|-----------|
| `/api/auth` | Registro, login, refresh, logout, `/me`, actividad |
| `/api/health` | Estado de la API |
| `/api` | Rutas de wallet (monedas, tasas; saldos y transacciones por implementar) |
| `/api-docs` | Swagger UI |

## Flujo de una petición

```
Request → route → (authMiddleware si es protegida) → controller → service → datos (BD o memoria)
Response ◀──────────────── controller ◀──────────── service ◀────────────┘
Errores  → errorHandler (wallet) / respuesta propia (auth)
```

Dependencias de afuera hacia adentro: `routes → controllers → services → datos`. Una capa no importa de una superior.

## Autenticación

- **Access token (JWT)**: dura 15 minutos y viaja en la cabecera `Authorization: Bearer <token>`.
- **Refresh token**: cookie `HttpOnly` (`refreshToken`, ruta `/api/auth`, 24 h) guardada también en la tabla `refresh_tokens`.
- El `authMiddleware` exige **ambos**: JWT válido y sesión activa asociada a la cookie. Las sesiones se bloquean tras 15 minutos sin actividad.
- Detalle completo y ejemplos para el frontend: [AUTH_API.md](AUTH_API.md).

## Estado de la wallet

La lógica de saldos y conversión existe sobre un almacén en memoria (`wallet.store.ts`). Las tablas `balances`, `transactions`, `contexts` y `context_budgets` ya existen en las migraciones, pero **aún no están conectadas**. El siguiente paso natural es crear repositorios que lean y escriban en PostgreSQL y retirar el almacén en memoria.

## Principios

1. **Rutas delgadas:** las rutas solo delegan.
2. **Lógica de negocio en servicios**, sin depender de `req`/`res`, para probarla aislada.
3. **SQL parametrizado siempre** (`$1`, `$2`), nunca concatenar texto.
4. **Configuración por entorno:** nada de secretos en el código.
5. **Errores consistentes:** ver el estado actual y el objetivo en [api.md](api.md).

## Pendientes por decidir (candidatos a ADR)

- Conectar la wallet a PostgreSQL (repositorios) y manejo de transacciones SQL.
- Unificar el formato de errores entre `auth` y `wallet`.
- Cookie de sesión en producción con frontend y backend en dominios distintos (`sameSite`, `secure`).
- Librería de validación de entradas.
- Estrategia de pruebas de integración con base de datos.
- Despliegue y entornos (Railway para el backend, Vercel para el frontend).
