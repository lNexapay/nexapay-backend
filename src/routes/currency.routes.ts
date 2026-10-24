import { Router } from "express";
import { getCurrencies, getRates } from "../controllers/currency.controller";

const router = Router();

/**
 * @swagger
 * /api/currencies:
 *   get:
 *     summary: Lista las monedas soportadas
 *     tags: [Monedas]
 *     responses:
 *       200:
 *         description: Lista de monedas (ARS, USD, COP, EUR)
 */
router.get("/currencies", getCurrencies);

/**
 * @swagger
 * /api/rates:
 *   get:
 *     summary: Tasas de cambio respecto a USD y fecha de actualización
 *     tags: [Monedas]
 *     responses:
 *       200:
 *         description: Tasas vigentes
 */
router.get("/rates", getRates);

export default router;