
import type { IncomingMessage, ServerResponse } from "node:http";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Cliente de AWS SES configurado en la región donde verificamos los correos.
// Las credenciales se obtienen automáticamente de las variables de entorno.
const ses = new SESClient({ region: "us-east-1" });

export default async function handler(
    req: IncomingMessage,
    res: ServerResponse,
) {
    // Solo permitimos solicitudes POST.
    if (req.method !== "POST") {
        res.writeHead(405, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Método no permitido" }));
    }

    // Verificamos la clave compartida para impedir envíos no autorizados.
    const authorization = req.headers.authorization;
    const expectedToken = process.env.EMAIL_SERVICE_SECRET;

    if (!expectedToken || authorization !== `Bearer ${expectedToken}`) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "No autorizado" }));
    }

    try {
        // Leemos el cuerpo JSON de la solicitud.
        let rawBody = "";

        for await (const chunk of req) {
            rawBody += chunk;

            // Evitamos recibir solicitudes excesivamente grandes.
            if (rawBody.length > 10_000) {
                res.writeHead(413);
                return res.end();
            }
        }

        const { email, name } = JSON.parse(rawBody);

        // Validamos los datos mínimos del destinatario.
        if (
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            typeof name !== "string" ||
            !name.trim()
        ) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Datos inválidos" }));
        }

        // El remitente debe ser una identidad verificada en AWS SES.
        const sender = process.env.SES_FROM_EMAIL;

        if (!sender) {
            throw new Error("Falta configurar SES_FROM_EMAIL");
        }

        // Enviamos el correo de bienvenida.
        await ses.send(
            new SendEmailCommand({
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
                            Data: `Hola ${name}:\n\n¡Bienvenido a NEXAPAY!\nTu cuenta fue creada correctamente.\n\nGracias por formar parte de nuestro proyecto.`,
                            Charset: "UTF-8",
                        },
                    },
                },
            }),
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Correo enviado" }));
    } catch (error) {
        console.error("Error al enviar correo con SES:", error);

        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "No se pudo enviar el correo" }));
    }
}
