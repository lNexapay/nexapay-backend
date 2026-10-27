# Servicio de correos — NEXAPAY

## 1. Descripción

NEXAPAY utiliza **AWS SES (Amazon Simple Email Service)** para enviar correos de bienvenida cuando se registra un usuario.

El envío se realiza mediante una **Vercel Function**, separada del backend principal que se ejecuta en Railway.

## 2. Arquitectura

El flujo de comunicación es:

1. El usuario envía una solicitud a `POST /api/auth/register`.
2. El backend Express registra al usuario y crea su billetera en PostgreSQL.
3. El backend responde con HTTP `201 Created`.
4. El servicio `welcome-email.service.ts` solicita el envío del correo a la Vercel Function.
5. La función `api/send-welcome.ts` valida la autorización y utiliza AWS SES para enviar el mensaje.

El envío del correo es una operación adicional: **si falla, no se cancela el registro del usuario**.

## 3. Archivos involucrados

| Archivo | Responsabilidad |
|---|---|
| `src/auth/auth.controller.ts` | Inicia el envío después del registro |
| `src/services/welcome-email.service.ts` | Realiza la solicitud HTTP a Vercel |
| `api/send-welcome.ts` | Envía el correo mediante AWS SES |
| `.env.example` | Documenta las variables de entorno del backend |

## 4. Configuración de AWS SES

- Región: `us-east-1` (Norte de Virginia).
- Entorno: Sandbox.
- Se requiere una identidad remitente verificada.
- En Sandbox, los destinatarios también deben estar verificados.
- Se utiliza un usuario IAM con permiso `ses:SendEmail`.

Para enviar correos a destinatarios no verificados será necesario solicitar acceso de producción en AWS SES.

## 5. Variables de entorno

### Railway — Backend Express

| Variable | Descripción |
|---|---|
| `WELCOME_EMAIL_FUNCTION_URL` | URL completa de la función `/api/send-welcome` |
| `EMAIL_SERVICE_SECRET` | Clave compartida para autenticar las solicitudes |

### Vercel — Servicio de correos

| Variable | Descripción |
|---|---|
| `AWS_ACCESS_KEY_ID` | Identificador de la clave IAM |
| `AWS_SECRET_ACCESS_KEY` | Clave secreta IAM |
| `SES_FROM_EMAIL` | Dirección remitente verificada en SES |
| `EMAIL_SERVICE_SECRET` | Misma clave compartida configurada en Railway |

Las credenciales y los secretos deben almacenarse en las variables de entorno de las plataformas. **Nunca deben incluirse en el repositorio.**

## 6. Seguridad

- La Vercel Function acepta únicamente solicitudes `POST`.
- Requiere un encabezado `Authorization: Bearer ...` con la clave compartida.
- Valida el nombre y el correo electrónico del destinatario.
- Las credenciales de AWS permanecen en Vercel.
- El usuario IAM tiene permisos limitados para el envío de correos.

## 7. Comportamiento ante errores

Si el servicio de correos no está configurado o no responde, el registro del usuario continúa funcionando.

Los errores de comunicación se registran en los logs del backend y los errores de AWS SES en los logs de la Vercel Function.

El envío no está garantizado ante reinicios o interrupciones del proceso, ya que actualmente no se utiliza una cola de tareas.

