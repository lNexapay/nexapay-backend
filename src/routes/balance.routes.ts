import { Router } from "express";
import {
  getBalance,
  getBalances,
  getTotalBalance,
} from "../controllers/balance.controller";

const router = Router();

/**
 * @swagger
 * /api/balances:
 *   get:
 *     summary: Saldos de la wallet (uno por moneda)
 *     tags: [Saldos]
 *     responses:
 *       200:
 *         description: Lista de saldos
 */
router.get("/balances", getBalances);

/**
 * @swagger
 * /api/balances/total:
 *   get:
 *     summary: Balance total convertido a una moneda base
 *     tags: [Saldos]
 *     parameters:
 *       - in: query
 *         name: base
 *         schema:
 *           type: string
 *           example: USD
 *         description: Moneda base (por defecto USD)
 *     responses:
 *       200:
 *         description: Total y desglose por moneda
 *       400:
 *         description: Moneda base no soportada
 */
router.get("/balances/total", getTotalBalance);

/**
 * @swagger
 * /api/balances/{currency}:
 *   get:
 *     summary: Saldo de una moneda
 *     tags: [Saldos]
 *     parameters:
 *       - in: path
 *         name: currency
 *         required: true
 *         schema:
 *           type: string
 *           example: COP
 *     responses:
 *       200:
 *         description: Saldo de la moneda
 *       400:
 *         description: Moneda no soportada
 *       404:
 *         description: La wallet no tiene saldo en esa moneda
 */
router.get("/balances/:currency", getBalance);

export default router;