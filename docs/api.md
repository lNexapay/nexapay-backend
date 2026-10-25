# API: convenciones y endpoints

Este documento tiene dos partes: **cómo está hoy** la API y **hacia dónde queremos llevarla** para que backend y frontend hablen el mismo idioma. Documentación interactiva: `http://localhost:3000/api-docs` (Swagger). Detalle de autenticación con ejemplos: [AUTH_API.md](AUTH_API.md).

## Endpoints actuales

| Método | Ruta | Auth | Descripción | Estado |
|--------|------|------|-------------|--------|
| `GET` | `/api/health` | No | Estado de la API | Listo |
| `POST` | `/api/auth/register` | No | Crea usuario y su billetera | Listo |
| `POST` | `/api/auth/login` | No | Inicia sesión; devuelve `token` y fija la cookie `refreshToken` | Listo |
| `POST` | `/api/auth/refresh` | Cookie | Renueva el access token | Listo |
| `POST` | `/api/auth/logout` | Cookie | Cierra la sesión | Listo |
| `POST` | `/api/auth/activity` | Bearer + cookie | Registra actividad (evita el bloqueo por inactividad) | Listo |
| `GET` | `/api/auth/me` | Bearer + cookie | Datos del usuario autenticado | Listo |
| `GET` | `/api/currencies` | No | Monedas disponibles | Listo |
| `GET` | `/api/rates` | No | Tasas de cambio | Listo (datos de ejemplo) |
| — | saldos (`balance`) | Sí | Consulta de saldos de la wallet | Por implementar |
| — | transacciones (`transaction`) | Sí | Historial y operaciones | Por implementar |

### Autenticación en pocas líneas

- Las rutas protegidas necesitan **dos cosas**: la cabecera `Authorization: Bearer <token>` **y** la cookie `refreshToken` (sesión activa).
- Por eso el frontend debe enviar siempre `credentials: "include"` en `fetch`.
- El access token dura 15 minutos; se renueva con `/api/auth/refresh`.

## Formato de errores

Hoy conviven **dos** formatos:

| Módulo | Forma | Ejemplo |
|--------|-------|---------|
| Auth | `{ "message": "..." }` | `{ "message": "Credenciales incorrectas" }` |
| Wallet (`errorHandler`) | `{ "error": "..." }` | `{ "error": "Moneda no soportada" }` |

**Objetivo (pendiente de acordar en un [ADR](adr/README.md)):** un único formato para toda la API, para que el frontend maneje los errores en un solo lugar. Hasta que se decida, el frontend debe tolerar ambos (`data.message ?? data.error`).

## Códigos de estado

| Código | Cuándo |
|--------|--------|
| `200` / `201` / `204` | Éxito (`201` al crear) |
| `400` | Petición inválida (datos mal formados o faltantes) |
| `401` | No autenticado, token inválido o sesión vencida |
| `403` | Autenticado sin permiso |
| `404` | Recurso inexistente |
| `409` | Conflicto (por ejemplo, email ya registrado) |
| `422` | Datos válidos en formato pero que incumplen una regla de negocio |
| `500` | Error inesperado del servidor |

## Convenciones para endpoints nuevos

- JSON en `camelCase`. URLs en minúsculas, sustantivos en plural y `kebab-case`: `/api/transactions`.
- Los verbos los da el método HTTP, no la URL.
- Fechas en **ISO 8601 y UTC**: `2026-10-23T14:30:00Z`.
- **Dinero:** nunca números de coma flotante en la base de datos (usa `DECIMAL`). Envía siempre el monto junto con su moneda (`currencyCode`). Acordar el formato de montos en el JSON (número o texto) y registrarlo en un ADR antes de exponer saldos.
- Listas con paginación cuando crezcan: `?page=1&pageSize=20`.
- Todo endpoint nuevo se **documenta con anotaciones Swagger** en su archivo de `routes/` y se agrega a la tabla de arriba.

### Plantilla para documentar un endpoint

```ts
/**
 * @swagger
 * /api/ejemplo:
 *   get:
 *     summary: Qué hace
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 */
```

(Se leen desde `src/routes/*.ts`; ver `src/routes/currency.routes.ts` como modelo.)
