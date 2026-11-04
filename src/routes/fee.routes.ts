import { Router } from "express";
import { getFees } from "../controllers/fee.controller";

const router = Router();

/**
 * @swagger
 * /api/fees:
 *   get:
 *     summary: Comisiones por par de monedas (en ambos sentidos) y de transferencias
 *     tags: [Monedas]
 *     responses:
 *       200:
 *         description: Porcentajes de comisión vigentes
 */
router.get("/fees", getFees);

export default router;
