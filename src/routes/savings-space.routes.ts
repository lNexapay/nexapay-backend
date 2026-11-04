
import { Router } from "express";

import {
    createSavingsSpace,
    getSavingsSpaces,
    getSavingsSpaceById,
    depositToSavingsSpace,
    withdrawFromSavingsSpace,
    getSavingsSpaceMovements,
} from "../controllers/savings-space.controller";

const router = Router();

// Crear un espacio de ahorro
router.post("/spaces", createSavingsSpace);

// Listar los espacios del usuario
router.get("/spaces", getSavingsSpaces);

// Obtener un espacio específico
router.get("/spaces/:id", getSavingsSpaceById);

// Agregar dinero a un espacio
router.post("/spaces/:id/deposit", depositToSavingsSpace);

// Retirar dinero de un espacio
router.post("/spaces/:id/withdraw", withdrawFromSavingsSpace);

// Consultar el historial de movimientos
router.get("/spaces/:id/movements", getSavingsSpaceMovements);

export default router;
