
import {
    SESClient,
    SendEmailCommand,
} from "@aws-sdk/client-ses";

/**
 * Servicio de correos de bienvenida de NEXAPAY.
 *
 * Envía correos directamente desde Railway
 * utilizando Amazon Simple Email Service (SES).
 *
 * Las credenciales de AWS se obtienen automáticamente
 * de las variables de entorno.
 */

const ses = new SESClient({
    region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Envía el correo de bienvenida a un usuario
 * después de registrarse en NEXAPAY.
 *
 * Si el envío falla, no interrumpe el registro.
 */
export const sendWelcomeEmail = async (
    name: string,
    email: string
): Promise<void> => {
    const sender = process.env.SES_FROM_EMAIL;

    // Verificamos que exista un remitente configurado.
    if (!sender) {
        console.warn(
            "Servicio de correo de bienvenida no configurado: falta SES_FROM_EMAIL"
        );
        return;
    }

    try {
        const command = new SendEmailCommand({
            Source: sender,
            Destination: {
                ToAddresses: [email],
            },
            Message: {
                Subject: {
                    Data: "¡Bienvenido a NEXAPAY!",
                    Charset: "UTF-8",
                },
                Body: {
                    Text: {
                        Data: `Hola ${name}:

¡Bienvenido a NEXAPAY!

Tu cuenta fue creada correctamente.

Desde ahora podés acceder a tu billetera digital y explorar las funcionalidades de nuestra plataforma.

Gracias por formar parte de NEXAPAY.

El equipo de NEXAPAY`,
                        Charset: "UTF-8",
                    },
                },
            },
        });

        const result = await ses.send(command, {
            abortSignal: AbortSignal.timeout(5000),
        });

        console.log(
            "Correo de bienvenida aceptado por AWS SES:",
            result.MessageId
        );
    } catch (error) {
        // Un error de AWS SES no debe impedir
        // que el usuario complete su registro.
        console.error(
            "No se pudo enviar el correo de bienvenida mediante AWS SES:",
            error
        );
    }
};
