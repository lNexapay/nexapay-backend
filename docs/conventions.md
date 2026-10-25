# Convenciones de código (backend)

Reglas simples para que el código se vea como si lo hubiera escrito una sola persona.

## TypeScript

- El `tsconfig.json` del repo manda. Evita `any`; si es inevitable, deja un comentario con el motivo.
- Tipa los parámetros y los retornos de funciones públicas.
- Usa `const` por defecto; `let` solo si se reasigna. Nunca `var`.
- Prefiere `async/await` sobre cadenas de `.then()`.
- Usa `unknown` en lugar de `any` al capturar errores (`catch (error: unknown)`).

## Nombres

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos | `camelCase` o `kebab-case` (elegir una y mantenerla) | `userService.ts` |
| Variables y funciones | `camelCase` | `getUserById` |
| Clases, tipos, interfaces | `PascalCase` | `UserRepository` |
| Constantes globales | `UPPER_SNAKE_CASE` | `MAX_LOGIN_ATTEMPTS` |
| Variables de entorno | `UPPER_SNAKE_CASE` | `DATABASE_URL` |

Los nombres deben decir **qué es**, no cómo se implementa. Evita abreviaturas ambiguas.

## Estructura del código

- Funciones cortas y con una sola responsabilidad.
- Evita lógica de negocio en rutas y controladores (ver [architecture.md](architecture.md)).
- Código duplicado más de dos veces → extraer a una función.
- Comentarios para explicar el **porqué**, no el **qué**.

## Base de datos

- Consultas siempre **parametrizadas**:

```ts
// Correcto
await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

// Incorrecto: vulnerable a inyección SQL
await pool.query(`SELECT * FROM usuarios WHERE email = '${email}'`);
```

- Los cambios al esquema van **siempre** en una migración (ver [database.md](database.md)).
- Usa transacciones cuando varias escrituras deban cumplirse juntas.

## Manejo de errores

- Valida las entradas en el borde (rutas/controladores).
- Lanza errores con información útil; el middleware central los convierte a la [respuesta estándar](api.md#formato-de-errores).
- No captures errores para ignorarlos en silencio.
- No imprimas secretos, contraseñas ni datos personales en los logs.

## Variables de entorno

- Toda variable nueva se agrega a `.env.example` (sin valor real) y a la tabla del README.
- Valida al arrancar que existan las obligatorias; falla rápido con un mensaje claro.

## Seguridad

- Nunca confíes en datos del cliente.
- Contraseñas siempre con hash (bcrypt/argon2), jamás en texto plano.
- Habilita CORS solo para los orígenes necesarios cuando se pase a producción.
- Mantén las dependencias actualizadas.

## Antes de abrir un PR

```bash
npx tsc --noEmit        # el código compila sin errores de tipos
npm run lint --if-present
npm test --if-present
```

El CI ejecuta estas mismas verificaciones.
