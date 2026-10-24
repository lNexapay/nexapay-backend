
/**
 * Controladores de autenticación de NEXAPAY.
 * Reciben las solicitudes HTTP y utilizan los servicios
 * para registrar usuarios e iniciar sesión.
 */

import { Request, Response } from "express";
import { registerUser, loginUser, getUserById } from "./auth.service";

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

        res.status(200).json({
            message: "Inicio de sesión exitoso",
            ...result
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