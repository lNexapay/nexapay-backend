/**
 * Rutas de autenticación de NEXAPAY.
 * Define los endpoints de registro, login
 * y consulta del usuario autenticado.
 */

import { Router } from "express";
import { register, login, getMe } from "./auth.controller";
import { authMiddleware } from "./auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// Ruta protegida: requiere un JWT válido.
router.get("/me", authMiddleware, getMe);

export default router;