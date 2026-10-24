/**
 * Middleware de autenticación de NEXAPAY.
 * Verifica el JWT recibido en las peticiones
 * y permite continuar solo a usuarios autenticados.
 */

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Obtener el encabezado Authorization.
    const authHeader = req.headers.authorization;

    // Verificar que tenga el formato "Bearer TOKEN".
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            message: "Token de autenticación requerido"
        });
        return;
    }

    // Extraer el token.
    const token = authHeader.split(" ")[1];

    // Obtener la clave secreta del backend.
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        res.status(500).json({
            message: "Error de configuración del servidor"
        });
        return;
    }

    try {
        // Verificar firma y vencimiento del token.
        const decoded = jwt.verify(token, jwtSecret);

        // Comprobar que el token contenga un userId válido.
        if (
            typeof decoded === "string" ||
            typeof (decoded as JwtPayload).userId !== "string"
        ) {
            res.status(401).json({
                message: "Token inválido"
            });
            return;
        }

        // Guardar el ID del usuario para las siguientes funciones.
        res.locals.userId = decoded.userId;

        // Permitir que la petición continúe.
        next();

    } catch (error) {
        res.status(401).json({
            message: "Token inválido o vencido"
        });
    }
};