# Primeros pasos (backend)

Guía para dejar el backend corriendo en tu máquina desde cero.

## 1. Requisitos

| Herramienta | Versión | Verificar |
|-------------|---------|-----------|
| Node.js | 20 o superior | `node -v` |
| npm | incluido con Node | `npm -v` |
| Git | cualquiera reciente | `git --version` |
| PostgreSQL | 13 o superior | `psql --version` (o Docker) |

## 2. Clonar e instalar

```bash
git clone https://github.com/lNexapay/nexapay-backend.git
cd nexapay-backend
npm install
```

## 3. Levantar PostgreSQL

Elige **una** de las dos opciones.

### Opción A: Docker (recomendada)

```bash
docker run --name nexapay-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=nexapay \
  -p 5432:5432 \
  -d postgres:16
```

Comandos útiles:

```bash
docker stop nexapay-db     # apagar
docker start nexapay-db    # volver a encender
docker rm -f nexapay-db    # borrarlo (se pierden los datos)
```

### Opción B: PostgreSQL instalado en tu máquina

Crea una base de datos vacía:

```bash
psql -U postgres -c "CREATE DATABASE nexapay;"
```

## 4. Variables de entorno

```bash
cp .env.example .env
```

Edita `.env`. Con la base de datos de Docker del paso anterior:

```
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nexapay
JWT_SECRET=un-secreto-largo-y-aleatorio-solo-para-desarrollo
FRONTEND_URL=http://localhost:5173
```

| Variable | Para qué sirve |
|----------|----------------|
| `PORT` | Puerto del servidor |
| `DATABASE_URL` | Conexión a PostgreSQL. Formato: `postgres://USUARIO:CLAVE@HOST:PUERTO/NOMBRE_BD` |
| `JWT_SECRET` | Clave con la que se firman los tokens. **Obligatoria**: sin ella el login y las rutas protegidas fallan |
| `FRONTEND_URL` | Origen del frontend permitido por CORS (además de `http://localhost:5173`). En producción, el dominio de Vercel |

> `.env` está en el `.gitignore`. Nunca lo subas ni lo pegues en chats o issues.

## 5. Aplicar migraciones

```bash
npm run migrate:up
```

Esto crea las tablas definidas en `migrations/`. Más detalle en [database.md](database.md).

## 6. Iniciar el servidor

```bash
npm run dev
```

El servidor reinicia solo cuando guardas cambios en `src/`.

Comprueba que responde:

- API: http://localhost:3000/api/health
- Documentación interactiva (Swagger): http://localhost:3000/api-docs

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL no está corriendo | `docker start nexapay-db` o inicia el servicio de PostgreSQL |
| `password authentication failed` | Usuario o clave incorrectos en `DATABASE_URL` | Revisa `.env` |
| `database "nexapay" does not exist` | No creaste la base de datos | Ver paso 3 |
| `Cannot find module 'dotenv/config'` | Faltan dependencias | `npm install` |
| `EADDRINUSE: address already in use` | El puerto ya está ocupado | Cambia `PORT` en `.env` o cierra el otro proceso |
| `migrate:up` dice que no hay `DATABASE_URL` | No existe `.env` o está vacío | Revisa el paso 4 |
| Rutas protegidas responden `500 Error de configuración del servidor`, o el login falla | Falta `JWT_SECRET` | Defínela en `.env` y reinicia |
| Error de CORS desde el frontend | El frontend corre en otro puerto u origen | Usa el puerto 5173 o ajusta `FRONTEND_URL` |

## Siguiente paso

Lee el [flujo de trabajo con Git](git-workflow.md) y [CONTRIBUTING.md](../CONTRIBUTING.md) antes de tu primer PR.
