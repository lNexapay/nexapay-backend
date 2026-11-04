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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       401:
 *         description: Sin sesión o token inválido
 *       200:
 *         description: Lista de saldos
 */
router.get("/balances", getBalances);


/**
 * @swagger
 * /api/balances/total:
 *   get:
 *     summary: Patrimonio total convertido a una moneda base
 *     description: >
 *       Calcula el patrimonio de la billetera incluyendo el dinero
 *       disponible y el reservado en espacios de ahorro.
 *       Los fondos reservados forman parte del patrimonio, pero
 *       no están disponibles para gastos, conversiones o transferencias.
 *     tags: [Saldos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: base
 *         schema:
 *           type: string
 *           enum: [ARS, USD, EUR, COP]
 *           default: USD
 *         description: Moneda utilizada para expresar el patrimonio total
 *     responses:
 *       200:
 *         description: Patrimonio total y desglose por moneda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletId:
 *                   type: string
 *                   description: Identificador de la billetera
 *                 baseCurrency:
 *                   type: string
 *                   example: ARS
 *                 total:
 *                   type: number
 *                   example: 100000
 *                 breakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       currencyCode:
 *                         type: string
 *                         example: ARS
 *                       amount:
 *                         type: number
 *                         description: Saldo total de la moneda, disponible más reservado
 *                         example: 100000
 *                       availableAmount:
 *                         type: number
 *                         description: Saldo disponible para operaciones
 *                         example: 98900
 *                       reservedAmount:
 *                         type: number
 *                         description: Saldo guardado en espacios de ahorro
 *                         example: 1100
 *                       convertedAmount:
 *                         type: number
 *                         description: Patrimonio de esa moneda convertido a la moneda base
 *                         example: 100000
 *       400:
 *         description: Moneda base no soportada
 *       401:
 *         description: Sin sesión o token inválido
 */
router.get("/balances/total", getTotalBalance);

/**
 * @swagger
 * /api/balances/{currency}:
 *   get:
 *     summary: Saldo de una moneda
 *     tags: [Saldos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: currency
 *         required: true
 *         schema:
 *           type: string
 *           example: COP
 *     responses:
 *       401:
 *         description: Sin sesión o token inválido
 *       200:
 *         description: Saldo de la moneda
 *       400:
 *         description: Moneda no soportada
 *       404:
 *         description: La wallet no tiene saldo en esa moneda
 */
router.get("/balances/:currency", getBalance);

export default router;