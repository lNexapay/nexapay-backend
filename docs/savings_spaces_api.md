# NEXAPAY — API de espacios de ahorro

## 1. Descripción general

El módulo **Mis espacios** permite a cada usuario organizar dinero de su billetera en espacios de ahorro independientes.

Cada espacio tiene un nombre, una moneda y una meta de ahorro opcional.

El usuario puede aportar y retirar dinero libremente. La meta es informativa y no impide realizar retiros ni aportar más dinero del objetivo.

**Ruta base:** `/api/spaces`

**Autenticación:** todos los endpoints requieren un access token JWT en el encabezado `Authorization: Bearer <token>` y la cookie de sesión `refreshToken`.

## 2. Modelo de datos

### Tabla `savings_spaces`

| Campo | Descripción |
|---|---|
| `id` | UUID único del espacio |
| `wallet_id` | Billetera propietaria |
| `name` | Nombre, entre 1 y 100 caracteres |
| `currency_code` | ARS, USD, EUR o COP |
| `target_amount` | Meta opcional, mayor que cero |
| `amount` | Saldo reservado, inicialmente cero |
| `created_at` | Fecha de creación |
| `updated_at` | Fecha de última modificación |

### Tabla `savings_space_movements`

| Campo | Descripción |
|---|---|
| `id` | UUID del movimiento |
| `space_id` | Espacio asociado |
| `type` | `deposit` o `withdraw` |
| `amount` | Importe positivo del movimiento |
| `created_at` | Fecha del movimiento |

**Migración:** `012_create_savings_spaces.up.sql`

## 3. Endpoints

### 3.1. Crear espacio

`POST /api/spaces`

**Body:**

```json
{
  "name": "Vacaciones",
  "currencyCode": "ARS",
  "targetAmount": 500000
}
```

`targetAmount` es opcional y puede ser `null`.

**Respuesta — 201 Created:**

```json
{
  "message": "Espacio creado correctamente",
  "space": {
    "id": "5e9b3307-7177-404c-82af-fda579332598",
    "name": "Vacaciones",
    "currencyCode": "ARS",
    "targetAmount": 500000,
    "amount": 0,
    "createdAt": "2026-11-03T15:34:12.305Z",
    "updatedAt": "2026-11-03T15:34:12.305Z"
  }
}
```

La creación no descuenta dinero de la billetera.

### 3.2. Listar espacios

`GET /api/spaces`

**Respuesta — 200 OK:**

```json
{
  "spaces": [
    {
      "id": "5e9b3307-7177-404c-82af-fda579332598",
      "name": "Vacaciones",
      "currencyCode": "ARS",
      "targetAmount": 500000,
      "amount": 600,
      "createdAt": "2026-11-03T15:34:12.305Z",
      "updatedAt": "2026-11-03T15:43:44.653Z"
    }
  ]
}
```

Devuelve únicamente los espacios del usuario autenticado, ordenados por fecha de creación descendente.

### 3.3. Consultar un espacio

`GET /api/spaces/:id`

**Respuesta — 200 OK:**

```json
{
  "space": {
    "id": "5e9b3307-7177-404c-82af-fda579332598",
    "name": "Vacaciones",
    "currencyCode": "ARS",
    "targetAmount": 500000,
    "amount": 600,
    "createdAt": "2026-11-03T15:34:12.305Z",
    "updatedAt": "2026-11-03T15:43:44.653Z"
  }
}
```

Si el espacio no existe o pertenece a otro usuario, responde `404`.

### 3.4. Aportar dinero

`POST /api/spaces/:id/deposit`

Transfiere dinero del saldo disponible de la billetera al saldo reservado del espacio, utilizando la misma moneda.

**Body:**

```json
{
  "amount": 1000
}
```

**Respuesta — 200 OK:**

```json
{
  "message": "Dinero agregado al espacio correctamente",
  "space": {
    "id": "5e9b3307-7177-404c-82af-fda579332598",
    "name": "Vacaciones",
    "currencyCode": "ARS",
    "targetAmount": 500000,
    "amount": 1000,
    "createdAt": "2026-11-03T15:34:12.305Z",
    "updatedAt": "2026-11-03T15:43:17.529Z"
  },
  "availableBalance": 99000,
  "movement": {
    "id": "57888d15-ec3b-4aa5-a9d5-e7637504a8bf",
    "type": "deposit",
    "amount": 1000,
    "createdAt": "2026-11-03T15:43:17.529Z"
  }
}
```

Si no hay saldo disponible suficiente, devuelve `400` con el mensaje `Saldo insuficiente`.

### 3.5. Retirar dinero

`POST /api/spaces/:id/withdraw`

Transfiere dinero del espacio al saldo disponible de la billetera, en la misma moneda.

**Body:**

```json
{
  "amount": 400
}
```

**Respuesta — 200 OK:**

```json
{
  "message": "Dinero retirado del espacio correctamente",
  "space": {
    "id": "5e9b3307-7177-404c-82af-fda579332598",
    "name": "Vacaciones",
    "currencyCode": "ARS",
    "targetAmount": 500000,
    "amount": 600,
    "createdAt": "2026-11-03T15:34:12.305Z",
    "updatedAt": "2026-11-03T15:43:44.653Z"
  },
  "availableBalance": 99400,
  "movement": {
    "id": "427bc780-338d-4933-85b4-a61455abcd06",
    "type": "withdraw",
    "amount": 400,
    "createdAt": "2026-11-03T15:43:44.653Z"
  }
}
```

Si el espacio no tiene saldo suficiente, devuelve `400` con el mensaje `Saldo insuficiente en el espacio`.

### 3.6. Consultar movimientos

`GET /api/spaces/:id/movements`

**Respuesta — 200 OK:**

```json
{
  "movements": [
    {
      "id": "427bc780-338d-4933-85b4-a61455abcd06",
      "type": "withdraw",
      "amount": 400,
      "createdAt": "2026-11-03T15:43:44.653Z"
    },
    {
      "id": "57888d15-ec3b-4aa5-a9d5-e7637504a8bf",
      "type": "deposit",
      "amount": 1000,
      "createdAt": "2026-11-03T15:43:17.529Z"
    }
  ]
}
```

Los movimientos se ordenan del más reciente al más antiguo. Si no hay movimientos, devuelve un arreglo vacío.

## 4. Validaciones

- Monedas admitidas: `ARS`, `USD`, `EUR`, `COP`.
- El nombre debe contener entre 1 y 100 caracteres, sin contar espacios iniciales o finales.
- Los importes deben ser números positivos con un máximo de dos decimales.
- Límite de importe por solicitud: `999999999999.99`.
- No se permiten aportes superiores al saldo disponible.
- No se permiten retiros superiores al saldo del espacio.
- Las metas son opcionales y no restringen aportes ni retiros.
- Un usuario no puede acceder a espacios de otra billetera.

## 5. Errores habituales

| HTTP | Mensaje | Motivo |
|---|---|---|
| 400 | `Importe inválido` o mensaje de validación | Importe no permitido |
| 400 | `Saldo insuficiente` | Aporte superior al saldo disponible |
| 400 | `Saldo insuficiente en el espacio` | Retiro superior al saldo reservado |
| 400 | `Identificador de espacio inválido` | UUID mal formado |
| 401 | `Token de autenticación requerido` | Falta autenticación |
| 404 | `Espacio no encontrado` | No existe o no pertenece al usuario |
| 404 | `Billetera no encontrada` | El usuario no tiene billetera |

Los mensajes de autenticación pueden variar según la causa del rechazo.

## 6. Integridad y seguridad

Los aportes y retiros se realizan mediante transacciones PostgreSQL (`BEGIN`, `COMMIT` y `ROLLBACK`).

Cada operación:

1. Identifica y bloquea la fila de la billetera mediante `SELECT ... FOR UPDATE`.
2. Verifica que el espacio pertenece al usuario autenticado.
3. Comprueba la disponibilidad de fondos.
4. Actualiza el saldo disponible y el saldo reservado.
5. Registra el movimiento en `savings_space_movements`.
6. Confirma la transacción solamente si todos los pasos terminan correctamente.

Los movimientos entre billetera y espacio no cambian el patrimonio total del usuario; solamente redistribuyen sus fondos.

## 7. Integración con el frontend

La página `/espacios` del frontend puede consumir los endpoints `/api/spaces`.

Para las solicitudes autenticadas se debe enviar el JWT y permitir las cookies de sesión.

Ejemplo:

```typescript
const response = await fetch("/api/spaces", {
  method: "GET",
  credentials: "include",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

if (!response.ok) {
  throw new Error("No se pudieron obtener los espacios");
}

const data = await response.json();
```

El frontend debe distinguir entre:

- **Saldo disponible:** dinero que puede utilizarse para operaciones de la billetera.
- **Saldo reservado:** dinero guardado en los espacios.
- **Saldo total:** suma de ambos, calculada por moneda.

La barra de progreso de cada espacio puede calcularse como `amount / targetAmount * 100` cuando exista una meta. Para la representación visual puede limitarse al 100 %, aunque el saldo supere el objetivo.

## 8. Estado de implementación

**Verificado manualmente:**

- Creación y listado de espacios.
- Consulta individual.
- Aportes y retiros.
- Rechazo por saldo insuficiente.
- Consulta del historial.
- Rechazo de solicitudes sin autenticación.
- Rechazo de consultas y movimientos sobre espacios de otro usuario.

**Pendiente:**

- Pruebas automatizadas y de concurrencia.
- Revisión del cálculo de patrimonio total para incluir los fondos reservados.
- Revisión de límites de saldos acumulados y precisión monetaria.
- Paginación del historial para espacios con muchos movimientos.
- Política de idempotencia para evitar duplicaciones por reintentos de solicitudes.
- Integración y pruebas del frontend.

