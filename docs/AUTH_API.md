# NEXAPAY — Documentación de autenticación

**Proyecto:** NEXAPAY Global Student  
**Backend:** Node.js + Express + TypeScript + PostgreSQL  
**Frontend:** React + TypeScript + Vite  
**Estado:** Endpoints implementados y probados localmente.

## 1. Configuración general

URL del backend en desarrollo:

```text
http://localhost:3000
```

Prefijo de autenticación:

```text
/api/auth
```

Todas las peticiones que envíen un cuerpo JSON deben utilizar:

```http
Content-Type: application/json
```

El backend permite solicitudes desde `http://localhost:5173`.

**Importante:** las peticiones relacionadas con sesiones deben incluir `credentials: "include"` para enviar y recibir cookies.

---

## 2. Registro de usuarios

**POST** `/api/auth/register`

Permite registrar un usuario nuevo. El backend crea automáticamente su billetera asociada.

### Body

```json
{
  "name": "Usuario Prueba",
  "email": "prueba@nexapay.com",
  "password": "Prueba1234"
}
```

### Respuesta exitosa — 201

```json
{
  "message": "Usuario registrado correctamente",
  "user": {
    "id": "uuid-del-usuario",
    "name": "Usuario Prueba",
    "email": "prueba@nexapay.com",
    "created_at": "2026-10-24T12:00:00.000Z"
  }
}
```

### Posibles errores

- `400`: datos inválidos o contraseña de menos de 8 caracteres.
- `409`: el email ya está registrado.
- `500`: error interno del servidor.

**Nota:** el registro no inicia sesión automáticamente. Después del registro, el frontend puede redirigir al login.

---

## 3. Inicio de sesión

**POST** `/api/auth/login`

### Body

```json
{
  "email": "prueba@nexapay.com",
  "password": "Prueba1234"
}
```

### Respuesta exitosa — 200

```json
{
  "message": "Inicio de sesión exitoso",
  "token": "JWT_ACCESS_TOKEN",
  "user": {
    "id": "uuid-del-usuario",
    "name": "Usuario Prueba",
    "email": "prueba@nexapay.com"
  }
}
```

Además, el backend envía una cookie `refreshToken` con la opción `HttpOnly`.

### Posibles errores

- `400`: faltan credenciales.
- `401`: email o contraseña incorrectos.
- `500`: error interno.

### Ejemplo desde React

```ts
const response = await fetch(
  "http://localhost:3000/api/auth/login",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      email,
      password
    })
  }
);

const data = await response.json();

if (!response.ok) {
  throw new Error(data.message);
}

// Guardar el access token en el estado de la aplicación.
const accessToken = data.token;
```

**Importante:** no hace falta guardar manualmente el refresh token. El navegador administra la cookie `HttpOnly`.

---

## 4. Obtener usuario autenticado

**GET** `/api/auth/me`

Es una ruta protegida. Requiere un access token válido y la cookie de una sesión activa.

### Headers

```http
Authorization: Bearer JWT_ACCESS_TOKEN
```

### Respuesta exitosa — 200

```json
{
  "user": {
    "id": "uuid-del-usuario",
    "name": "Usuario Prueba",
    "email": "prueba@nexapay.com",
    "created_at": "2026-10-24T12:00:00.000Z"
  }
}
```

### Ejemplo desde React

```ts
const response = await fetch(
  "http://localhost:3000/api/auth/me",
  {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    credentials: "include"
  }
);
```

### Errores habituales

- `401`: JWT ausente, inválido o vencido; sesión revocada o inactiva.
- `404`: usuario no encontrado.

---

## 5. Renovar el access token

**POST** `/api/auth/refresh`

Permite generar un nuevo JWT sin volver a ingresar la contraseña.

No necesita body ni header `Authorization`. Utiliza la cookie `refreshToken`.

### Ejemplo desde React

```ts
const response = await fetch(
  "http://localhost:3000/api/auth/refresh",
  {
    method: "POST",
    credentials: "include"
  }
);

if (!response.ok) {
  // La sesión no puede renovarse.
  // Solicitar nuevamente el login.
}

const data = await response.json();

// Reemplazar el access token anterior.
const newAccessToken = data.token;
```

### Respuesta exitosa — 200

```json
{
  "token": "NUEVO_JWT_ACCESS_TOKEN"
}
```

### Error — 401

La sesión no existe, está vencida, fue revocada o superó el límite de inactividad.

**Comportamiento:** el refresh token original conserva su vencimiento. Renovar el JWT no extiende las 24 horas de sesión máxima.

---

## 6. Registrar actividad del usuario

**POST** `/api/auth/activity`

Actualiza la última actividad de la sesión en PostgreSQL.

Requiere un JWT válido y la cookie `refreshToken`.

### Ejemplo desde React

```ts
const response = await fetch(
  "http://localhost:3000/api/auth/activity",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    credentials: "include"
  }
);
```

### Respuesta exitosa — 200

```json
{
  "message": "Actividad registrada correctamente"
}
```

### Error — 401

La sesión ya venció o superó los 15 minutos de inactividad.

### Recomendación para React

Detectar interacciones reales del usuario, como clics, escritura o navegación.

Para evitar peticiones excesivas, enviar `/activity` como máximo una vez por minuto mientras haya actividad.

**No enviar peticiones automáticamente si el usuario está inactivo**, porque se perdería el propósito del bloqueo.

---

## 7. Cerrar sesión

**POST** `/api/auth/logout`

Revoca el refresh token en PostgreSQL y elimina su cookie.

### Ejemplo desde React

```ts
await fetch(
  "http://localhost:3000/api/auth/logout",
  {
    method: "POST",
    credentials: "include"
  }
);

// Limpiar el access token del estado de React.
// Redirigir a la pantalla de login.
```

### Respuesta exitosa — 200

```json
{
  "message": "Sesión cerrada correctamente"
}
```

El frontend también debe eliminar el JWT que conserva en memoria.

---

## 8. Política de sesiones

| Característica | Configuración |
|---|---|
| Access token | 15 minutos |
| Refresh token | 24 horas |
| Inactividad máxima | 15 minutos |
| Renovación de JWT | Mediante `/refresh` |
| Cierre de sesión | Revocación en PostgreSQL |
| Almacenamiento del refresh token | Cookie HttpOnly |

Una sesión puede terminar por logout, vencimiento de 24 horas o 15 minutos sin actividad registrada.

El frontend debe redirigir al login cuando ya no sea posible renovar la sesión.

---

## 9. Flujo recomendado en React

1. El usuario completa el formulario de login.
2. React llama a `/login` con `credentials: "include"`.
3. Guarda el JWT en el estado de autenticación.
4. Utiliza el JWT para consultar rutas protegidas.
5. Registra actividad real mediante `/activity`.
6. Cuando vence el JWT, llama a `/refresh` y actualiza el token.
7. Al recargar la página, intenta recuperar la sesión mediante `/refresh`.
8. Si la renovación falla, redirige al login.
9. Cuando el usuario cierra sesión, llama a `/logout` y limpia el estado.

### Consideraciones para la integración

- Se recomienda mantener el JWT en memoria mediante un contexto de React.
- Evitar almacenar el refresh token en `localStorage`.
- Centralizar las peticiones HTTP para gestionar la renovación del JWT.
- No ejecutar renovaciones indefinidas en segundo plano sin actividad del usuario.
- Evitar que varias peticiones intenten renovar el JWT simultáneamente.

---

## 10. Despliegue en producción

La configuración actual está preparada para desarrollo local.

Antes de conectar el frontend desplegado en Vercel con el backend de Railway, se deberá:

- Configurar la URL real del backend en React.
- Autorizar el dominio del frontend en CORS.
- Revisar `SameSite` y `Secure` de las cookies para peticiones entre dominios.
- Utilizar HTTPS.
- Revisar las protecciones de las peticiones autenticadas mediante cookies.

---

**Estado de integración:** backend de autenticación implementado y probado. Pendiente conectar los formularios y la gestión de sesión del frontend React.