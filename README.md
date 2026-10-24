# nexapay-backend

## API – Autenticación

El backend de NEXAPAY utiliza Express, TypeScript y PostgreSQL.

### URL base

Durante el desarrollo local:

`http://localhost:3000`

Cuando el backend esté desplegado en Railway, se utilizará la URL pública correspondiente.

### 1. Registrar usuario

**Endpoint:** `POST /api/auth/register`

**Estado:** Implementado y probado.

**Body (JSON):**

```json
{
  "name": "Juan Pérez",
  "email": "juan@gmail.com",
  "password": "MiClave123"
}
```

**Respuesta exitosa — 201 Created:**

```json
{
  "message": "Usuario registrado correctamente",
  "user": {
    "id": "uuid-del-usuario",
    "name": "Juan Pérez",
    "email": "juan@gmail.com",
    "created_at": "2026-10-23T15:17:33.080Z"
  }
}
```

**Errores posibles:**

- `400 Bad Request`: faltan datos o la contraseña tiene menos de 8 caracteres.
- `409 Conflict`: el email ya está registrado.
- `500 Internal Server Error`: ocurrió un error inesperado.

**Comportamiento:** al registrarse correctamente, se crea automáticamente una billetera asociada al usuario.

### 2. Iniciar sesión

**Endpoint:** `POST /api/auth/login`

**Estado:** En desarrollo. La ruta existe, pero todavía no autentica al usuario ni genera un JWT.

**Body previsto (JSON):**

```json
{
  "email": "juan@gmail.com",
  "password": "MiClave123"
}
```

**Respuesta prevista:**

```json
{
  "token": "jwt-del-usuario",
  "user": {
    "id": "uuid-del-usuario",
    "name": "Juan Pérez",
    "email": "juan@gmail.com"
  }
}
```

La respuesta definitiva se documentará cuando esté implementado el login.

### 3. Renovación de sesión

**Endpoint previsto:** `POST /api/auth/refresh`

**Estado:** Pendiente de implementación.

Permitirá renovar el token de acceso sin solicitar nuevamente la contraseña, mientras la sesión siga siendo válida.

### Integración desde React

Ejemplo para registrar un usuario:

```ts
const response = await fetch(
  "http://localhost:3000/api/auth/register",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Juan Pérez",
      email: "juan@gmail.com",
      password: "MiClave123"
    })
  }
);

const data = await response.json();

if (!response.ok) {
  throw new Error(data.message);
}

console.log(data);
```

**Importante:**

- El frontend debe enviar los datos en formato JSON.
- Nunca debe enviar ni recibir el hash de la contraseña.
- El backend actualmente permite peticiones CORS desde `http://localhost:5173`.
- Los endpoints de login y refresh todavía no están listos para integrarse completamente.