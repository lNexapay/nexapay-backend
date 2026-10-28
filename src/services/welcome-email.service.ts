
/**
 * Servicio de correos de bienvenida de NEXAPAY.
 *
 * Solicita a nuestra Vercel Function que envíe un correo
 * mediante AWS SES, sin exponer credenciales de AWS
 * dentro del backend de Railway.
 */

export const sendWelcomeEmail = async (
    name: string,
    email: string
): Promise<void> => {
    // Dirección de la función desplegada en Vercel.
    const functionUrl = process.env.WELCOME_EMAIL_FUNCTION_URL;

    // Clave privada compartida entre Railway y Vercel.
    const serviceSecret = process.env.EMAIL_SERVICE_SECRET;

    // Si todavía no configuramos el servicio, no interrumpimos el registro.
    if (!functionUrl || !serviceSecret) {
        console.warn("Servicio de correo de bienvenida no configurado");
        return;
    }

    try {
        // Enviar los datos del usuario a la Vercel Function.
        const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceSecret}`
            },
            body: JSON.stringify({ name, email }),
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            console.error(
                `Error del servicio de correo: HTTP ${response.status}`
            );
        }
    } catch (error) {
        // Un problema con SES o Vercel no debe impedir crear la cuenta.
        console.error("No se pudo solicitar el correo de bienvenida:", error);
    }
};
