# NEXAPAY — Documentación de autenticación

**Proyecto:** NEXAPAY Global Student  
**Backend:** Node.js + Express + TypeScript + PostgreSQL  
**Frontend:** React + TypeScript + Vite  
**Estado:** Autenticación integrada con el frontend. La incorporación de `account_number` al servicio está implementada y probada localmente; su disponibilidad pública depende de desplegar la versión actualizada del backend.

## 1. Configuración general

**Backend local:** `http://localhost:3000`  
**Prefijo de autenticación:** `/api/auth`  
**Frontend local:** `http://localhost:5173`

Las solicitudes con cuerpo JSON deben enviar:

```http
Content-Type: application/json
```

Las solicitudes que utilizan la sesión deben incluir `credentials: "include"` para enviar y recibir la cookie de renovación.

### Entornos desplegados

- **Frontend Vercel:** `https://nexapay-frontend-seven.vercel.app`
- **Backend Railway:** `https://nexapay-backend-production-94be.up.railway.app`

En producción, el frontend usa rutas relativas (`/api/...`) y un *rewrite* de Vercel que redirige las solicitudes al backend de Railway. Esto evita depender de cookies de terceros entre los dominios de Vercel y Railway.

## 2. Registro de usuarios

**`POST /api/auth/register`**

Registra un usuario y crea, en una misma transacción de PostgreSQL, su billetera y cuatro balances iniciales: ARS, USD, EUR y COP.

### Body

```json
{
  "name": "Usuario Prueba",
  "email": "prueba@nexapay.com",
  "password": "Prueba1234"
}
```

### Respuesta exitosa — `201`

```json
{
  "message": "Usuario registrado correctamente",
  "user": {
    "id": "uuid-del-usuario",
    "name": "Usuario Prueba",
    "email": "prueba@nexapay.com",
    "account_number": "58301742",
    "created_at": "2026-10-30T12:00:00.000Z"
  }
}
```

`account_number` se genera automáticamente en PostgreSQL. El ejemplo anterior es ilustrativo: el número real es aleatorio.

### Posibles errores

- `400`: datos inválidos o contraseña de menos de ocho caracteres.
- `409`: email ya registrado.
- `500`: error interno del servidor, incluido un fallo excepcional tras agotar los reintentos de generación del número de cuenta.

El registro **no inicia sesión automáticamente**. Después del registro, el frontend puede redirigir al login. Tras confirmar el registro, el backend solicita el envío del correo de bienvenida sin bloquear la respuesta HTTP.

## 3. Número de cuenta NEXAPAY

Cada usuario dispone de **un único número de cuenta interno de ocho dígitos**, compartido por sus balances en las cuatro monedas.

| Propiedad | Implementación |
|---|---|
| Campo | `users.account_number` |
| Tipo | `VARCHAR(8)` |
| Formato | Ocho dígitos (`^[0-9]{8}$`) |
| Generación | Aleatoria, mediante función de PostgreSQL |
| Unicidad | Restricción `UNIQUE` |
| Obligatoriedad | `NOT NULL` |
| Registro | Valor generado por defecto en la base de datos |
| Colisiones | El servicio de registro reintenta hasta cinco veces si falla la restricción de unicidad de la cuenta |

La migración `011_add_account_number_to_users.up.sql` asigna números a los usuarios existentes y habilita la generación para los nuevos.

El número de cuenta **no reemplaza** el UUID de `users.id`, no es una contraseña y no autoriza operaciones por sí solo. Es un identificador interno de NEXAPAY para futuras transferencias entre usuarios; **no es un CBU ni un CVU oficial**.

**Integración frontend:** mostrar `account_number` como texto, no convertirlo a `number`. Puede presentarse visualmente como `5830 1742`, pero para copiarlo o enviarlo a la API conviene utilizar los ocho dígitos sin espacios. El backend ya incluye el campo en las respuestas del registro, login y `/me` en el código actualizado. Su disponibilidad en Railway requiere desplegar esa versión.

## 4. Inicio de sesión

**`POST /api/auth/login`**

### Body

```json
{
  "email": "prueba@nexapay.com",
  "password": "Prueba1234"
}
```

### Respuesta exitosa — `200`

```json
{
  "message": "Inicio de sesión exitoso",
  "token": "JWT_ACCESS_TOKEN",
  "user": {
    "id": "uuid-del-usuario",
    "name": "Usuario Prueba",
    "email": "prueba@nexapay.com",
    "account_number": "58301742"
  }
}
```

El backend también establece una cookie `refreshToken` con `HttpOnly` y ruta `/api`, necesaria para renovar la sesión y para las rutas protegidas que verifican la sesión activa.

### Posibles errores

- `400`: credenciales ausentes o inválidas.
- `401`: email o contraseña incorrectos.
- `500`: error interno.

### Ejemplo desde React

```ts
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, password })
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);

const accessToken = data.token;
const accountNumber = data.user.account_number;
```

El ejemplo utiliza la ruta relativa de producción. En desarrollo local, el cliente HTTP puede usar la URL del backend configurada mediante `VITE_API_URL`.

El refresh token **no se almacena manualmente**: el navegador administra la cookie `HttpOnly`.

## 5. Obtener el usuario autenticado

**`GET /api/auth/me`**

Ruta protegida. Requiere JWT válido y la cookie correspondiente a una sesión activa, de acuerdo con el middleware de autenticación.

### Headers

```http
Authorization: Bearer JWT_ACCESS_TOKEN
```

### Respuesta exitosa — `200`

```json
{
  "user": {
    "id": "uuid-del-usuario",
    "name": "Usuario Prueba",
    "email": "prueba@nexapay.com",
    "account_number": "58301742",
    "created_at": "2026-10-30T12:00:00.000Z"
  }
}
```

### Ejemplo desde React

```ts
const response = await fetch("/api/auth/me", {
  headers: { Authorization: `Bearer ${accessToken}` },
  credentials: "include"
});

const data = await response.json();
if (!response.ok) throw new Error(data.message);

const user = data.user;
```

### Errores habituales

- `401`: JWT ausente, inválido o vencido; sesión revocada o inactiva.
- `404`: usuario no encontrado.
- `500`: error interno.

Este endpoint permite recuperar el número de cuenta al recargar el dashboard, una vez renovado el JWT si es necesario.

## 6. Renovar el access token

**`POST /api/auth/refresh`**

Genera un JWT nuevo sin pedir nuevamente la contraseña. No requiere body ni header `Authorization`: utiliza la cookie `refreshToken`.

### Ejemplo desde React

```ts
const response = await fetch("/api/auth/refresh", {
  method: "POST",
  credentials: "include"
});

if (!response.ok) {
  // La sesión no puede renovarse: solicitar login.
}

const data = await response.json();
const newAccessToken = data.token;
```

### Respuesta exitosa — `200`

```json
{
  "token": "NUEVO_JWT_ACCESS_TOKEN"
}
```

### Error — `401`

La sesión no existe, está vencida, fue revocada o excedió el límite de inactividad.

**Importante:** `/refresh` no devuelve el objeto `user` ni `account_number`. Después de recuperar el JWT, consultar `/me` si se necesitan los datos del usuario.

Renovar el JWT no extiende automáticamente el vencimiento máximo de 24 horas de la sesión.

## 7. Registrar actividad del usuario

**`POST /api/auth/activity`**

Actualiza la última actividad de la sesión en PostgreSQL. Requiere JWT válido y cookie `refreshToken`.

### Ejemplo desde React

```ts
const response = await fetch("/api/auth/activity", {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
  credentials: "include"
});
```

### Respuesta exitosa — `200`

```json
{
  "message": "Actividad registrada correctamente"
}
```

### Error — `401`

La sesión venció, fue revocada o superó el límite de inactividad.

**Recomendación:** registrar interacciones reales (clics, escritura, navegación) y limitar el envío de `/activity` a una petición por minuto mientras haya actividad. No generar actividad artificial cuando el usuario está inactivo.

## 8. Cerrar sesión

**`POST /api/auth/logout`**

Revoca el refresh token en PostgreSQL y elimina la cookie de sesión.

### Ejemplo desde React

```ts
await fetch("/api/auth/logout", {
  method: "POST",
  credentials: "include"
});

// Eliminar el access token del estado de React.
// Redirigir al login.
```

### Respuesta exitosa — `200`

```json
{
  "message": "Sesión cerrada correctamente"
}
```

El frontend también debe limpiar el JWT conservado en memoria.

## 9. Política de sesiones

| Característica | Configuración |
|---|---|
| Access token | 15 minutos |
| Refresh token | 24 horas |
| Inactividad máxima | 15 minutos |
| Renovación del JWT | `/api/auth/refresh` |
| Registro de actividad | `/api/auth/activity` |
| Cierre de sesión | Revocación en PostgreSQL |
| Almacenamiento del refresh token | Cookie `HttpOnly`, ruta `/api` |

La sesión puede finalizar por logout, vencimiento del refresh token o inactividad. El frontend debe redirigir al login cuando no sea posible renovarla.

## 10. Flujo recomendado en React

1. El usuario completa el formulario de login.
2. React llama a `/api/auth/login` con `credentials: "include"`.
3. Guarda el JWT y los datos del usuario en el estado de autenticación.
4. Lee `user.account_number` para mostrar el número de cuenta.
5. Utiliza el JWT para consultar rutas protegidas.
6. Registra actividad real mediante `/api/auth/activity`.
7. Cuando vence el JWT, llama a `/api/auth/refresh` y actualiza el token.
8. Al recargar la página, intenta recuperar la sesión mediante `/refresh` y luego consulta `/me` para recuperar los datos del usuario.
9. Si la renovación falla, redirige al login.
10. Al cerrar sesión, llama a `/logout` y limpia el estado.

### Consideraciones de integración

- Mantener el JWT preferentemente en memoria, mediante un contexto de React.
- No almacenar el refresh token en `localStorage`.
- Centralizar las peticiones HTTP y la renovación del JWT.
- Evitar renovaciones indefinidas sin actividad del usuario.
- Evitar que varias peticiones intenten renovar el JWT simultáneamente.
- Mostrar el número de cuenta en el dashboard y en la barra lateral, con opción para copiarlo.
- No utilizar el número de cuenta como prueba de identidad o autorización.

## 11. Despliegue en producción

El frontend está desplegado en Vercel y el backend en Railway, con PostgreSQL.

En producción, el frontend utiliza un *rewrite* de Vercel para enviar `/api/*` al backend de Railway. El cliente HTTP usa rutas relativas y `credentials: "include"` para las operaciones de sesión.

El backend configura la cookie `refreshToken` con `HttpOnly`, `Secure` en producción, `SameSite=None` en producción y ruta `/api`. La cookie debe mantenerse protegida y no exponerse a JavaScript.

### Variables y medidas de seguridad

- Mantener `DATABASE_URL`, `JWT_SECRET` y las credenciales de servicios externos fuera del repositorio.
- Utilizar HTTPS.
- Revisar CORS, cookies y proxy cuando cambien los dominios.
- Validar permisos y saldos en el servidor para cada operación financiera.
- No confundir el número de cuenta interno con un identificador bancario oficial.

### Estado de la funcionalidad de números de cuenta

La migración `011` fue aplicada a PostgreSQL de Railway y se comprobó que los 14 usuarios existentes tienen un número válido y único. Los cambios de `auth.service.ts` están implementados y las pruebas locales pasaron. **Hasta confirmar el despliegue del backend actualizado, no debe darse por hecho que la API pública ya devuelve `account_number`.**

## 12. Estado de integración

La autenticación y gestión de sesiones están integradas con el frontend React. El registro, login, renovación de JWT y cierre de sesión funcionan en el proyecto desplegado.

La generación y persistencia de números de cuenta NEXAPAY ya están implementadas en PostgreSQL. La exposición del campo en las respuestas de autenticación está implementada en el código del backend, pendiente de confirmar su despliegue. La visualización del número de cuenta en el frontend y su uso en transferencias internas son los siguientes pasos.
