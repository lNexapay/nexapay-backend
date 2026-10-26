
/**
 * Controladores de autenticación de NEXAPAY.
 * Reciben las solicitudes HTTP y utilizan los servicios
 * para registrar usuarios e iniciar sesión.
 */

import { Request, Response } from "express";
import { registerUser, loginUser, getUserById } from "./auth.service";
import jwt from "jsonwebtoken";
import {
    validateRefreshToken,
    revokeRefreshToken,
    updateSessionActivity
} from "./refresh-token.service";

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        // Validar que los campos sean cadenas de texto.
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            password.length < 8
        ) {
            res.status(400).json({
                message: "Ingresá nombre, email y una contraseña de al menos 8 caracteres"
            });
            return;
        }

        // Llamar al servicio para crear el usuario y su billetera.
        const user = await registerUser(
            name.trim(),
            email.trim().toLowerCase(),
            password
        );

        res.status(201).json({
            message: "Usuario registrado correctamente",
            user
        });

    } catch (error) {
        console.error("Error al registrar usuario:", error);

        if (
            error instanceof Error &&
            error.message === "El email ya está registrado"
        ) {
            res.status(409).json({
                message: error.message
            });
            return;
        }

        // PostgreSQL: email duplicado (restricción UNIQUE).
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505"
        ) {
            res.status(409).json({
                message: "El email ya está registrado"
            });
            return;
        }

        res.status(500).json({
            message: "Error interno al registrar usuario"
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Validar los datos recibidos.
        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            res.status(400).json({
                message: "Ingresá email y contraseña"
            });
            return;
        }

        // Verificar credenciales y generar el token.
        const result = await loginUser(
            email.trim().toLowerCase(),
            password
        );

        // Borrar la cookie con la ruta anterior (/api/auth), si existe,
        // para no quedar con dos cookies "refreshToken".
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/api/auth"
        });

        // Guardar el refresh token en una cookie HttpOnly.
        // La ruta es /api (y no /api/auth) porque authMiddleware exige esta
        // cookie también en las rutas de wallet (/api/balances, /api/deposit...).
        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
            path: "/api"
        });

        // Enviar solamente el access token y los datos del usuario.
        res.status(200).json({
            message: "Inicio de sesión exitoso",
            token: result.token,
            user: result.user
        });

    } catch (error) {
        console.error("Error al iniciar sesión:", error);

        if (
            error instanceof Error &&
            error.message === "Credenciales incorrectas"
        ) {
            res.status(401).json({
                message: "Email o contraseña incorrectos"
            });
            return;
        }

        res.status(500).json({
            message: "Error interno al iniciar sesión"
        });
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.userId;

        const user = await getUserById(userId);

        if (!user) {
            res.status(404).json({
                message: "Usuario no encontrado"
            });
            return;
        }

        res.status(200).json({ user });

    } catch (error) {
        console.error("Error al obtener usuario:", error);

        res.status(500).json({
            message: "Error interno al obtener usuario"
        });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        // Obtener las cookies enviadas por el navegador.
        const cookies = req.headers.cookie;

        // Buscar la cookie que contiene el refresh token.
        const refreshCookie = cookies
            ?.split(";")
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith("refreshToken="));

        const refreshToken = refreshCookie
            ? refreshCookie.substring("refreshToken=".length)
            : null;

        if (!refreshToken) {
            res.status(401).json({
                message: "No hay una sesión para renovar"
            });
            return;
        }

        // Verificar que la sesión exista y no haya vencido.
        const session = await validateRefreshToken(refreshToken);

        if (!session) {
            res.status(401).json({
                message: "Sesión vencida o inválida"
            });
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET no está configurado");
        }

        // Generar un nuevo JWT válido durante 15 minutos.
        const token = jwt.sign(
            { userId: session.user_id },
            jwtSecret,
            { expiresIn: "15m" }
        );

        res.status(200).json({
            token
        });

    } catch (error) {
        console.error("Error al renovar sesión:", error);

        res.status(500).json({
            message: "Error interno al renovar sesión"
        });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        // Obtener el refresh token desde las cookies.
        const refreshCookie = req.headers.cookie
            ?.split(";")
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith("refreshToken="));

        const refreshToken = refreshCookie
            ? refreshCookie.substring("refreshToken=".length)
            : null;

        // Revocar la sesión si existe un refresh token.
        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
        }

        // Eliminar la cookie del navegador (ruta actual y la anterior).
        for (const cookiePath of ["/api", "/api/auth"]) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                path: cookiePath
            });
        }

        res.status(200).json({
            message: "Sesión cerrada correctamente"
        });

    } catch (error) {
        console.error("Error al cerrar sesión:", error);

        res.status(500).json({
            message: "Error interno al cerrar sesión"
        });
    }
};

export const activity = async (req: Request, res: Response) => {
    try {
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

        // Actualizar la actividad si la sesión sigue vigente.
        const session = await updateSessionActivity(refreshToken);

        if (!session) {
            res.status(401).json({
                message: "Sesión vencida o inactiva"
            });
            return;
        }

        res.status(200).json({
            message: "Actividad registrada correctamente"
        });

    } catch (error) {
        console.error("Error al registrar actividad:", error);

        res.status(500).json({
            message: "Error interno al registrar actividad"
        });
    }
};