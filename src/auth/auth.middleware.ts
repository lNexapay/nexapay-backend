/**
 * Middleware de autenticación de NEXAPAY.
 * Verifica el JWT recibido en las peticiones
 * y permite continuar solo a usuarios autenticados.
 */

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { validateRefreshToken } from "./refresh-token.service";

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            message: "Token de autenticación requerido"
        });
        return;
    }

    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        res.status(500).json({
            message: "Error de configuración del servidor"
        });
        return;
    }

    try {
        // Verificar que el JWT sea válido.
        const decoded = jwt.verify(token, jwtSecret);

        if (
            typeof decoded === "string" ||
            typeof decoded.userId !== "string"
        ) {
            res.status(401).json({
                message: "Token inválido"
            });
            return;
        }

        // Obtener el refresh token desde la cookie.
        const refreshCookie = req.headers.cookie
            ?.split(";")
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith("refreshToken="));

        const refreshToken = refreshCookie
            ? refreshCookie.substring("refreshToken=".length)
            : null;

        if (!refreshToken) {
            res.status(401).json({
                message: "Sesión no encontrada"
            });
            return;
        }

        // Comprobar que la sesión continúe activa.
        const session = await validateRefreshToken(refreshToken);

        if (!session || session.user_id !== decoded.userId) {
            res.status(401).json({
                message: "Sesión vencida o inactiva"
            });
            return;
        }

        // Guardar el ID del usuario para los controladores.
        res.locals.userId = decoded.userId;

        next();

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                message: "Token inválido o vencido"
            });
            return;
        }

        console.error("Error al verificar sesión:", error);

        res.status(500).json({
            message: "Error interno al verificar sesión"
        });
    }
};