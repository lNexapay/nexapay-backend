
/**
 * Rutas de autenticación de NEXAPAY.
 * Define los endpoints de registro, login
 * y consulta del usuario autenticado.
 */

import { Router } from "express";
import {
    register,
    login,
    googleLogin,
    getMe,
    refresh,
    logout,
    activity
} from "./auth.controller";

import { authMiddleware } from "./auth.middleware";

const router = Router();

// Registro e inicio de sesión.
router.post("/register", register);
router.post("/login", login);

// Inicio de sesión mediante Google.
router.post("/google", googleLogin);

// Gestión de sesiones.
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/activity", authMiddleware, activity);

// Ruta protegida: requiere un JWT válido.
router.get("/me", authMiddleware, getMe);

export default router;
