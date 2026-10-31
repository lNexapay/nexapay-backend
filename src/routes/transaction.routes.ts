import { Router } from "express";
import {
  convert,
  deposit,
  getTransactions,
  transfer,
} from "../controllers/transaction.controller";

const router = Router();

/**
 * @swagger
 * /api/deposit:
 *   post:
 *     summary: Ingresa dinero simulado en una moneda
 *     tags: [Operaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currency, amount]
 *             properties:
 *               currency:
 *                 type: string
 *                 example: USD
 *               amount:
 *                 type: number
 *                 example: 50
 *               description:
 *                 type: string
 *                 example: Depósito automático
 *     responses:
 *       401:
 *         description: Sin sesión o token inválido
 *       201:
 *         description: Ingreso registrado
 *       400:
 *         description: Moneda no soportada o monto inválido
 */
router.post("/deposit", deposit);

/**
 * @swagger
 * /api/convert:
 *   post:
 *     summary: Convierte dinero de una moneda a otra
 *     tags: [Operaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [from, to, amount]
 *             properties:
 *               from:
 *                 type: string
 *                 example: USD
 *               to:
 *                 type: string
 *                 example: COP
 *               amount:
 *                 type: number
 *                 example: 100
 *               description:
 *                 type: string
 *     responses:
 *       401:
 *         description: Sin sesión o token inválido
 *       201:
 *         description: Conversión realizada
 *       400:
 *         description: Moneda no soportada, monto inválido o saldo insuficiente
 */
router.post("/convert", convert);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Historial de operaciones (las más recientes primero)
 *     tags: [Operaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *         description: Máximo de operaciones a devolver (hasta 100)
 *     responses:
 *       401:
 *         description: Sin sesión o token inválido
 *       200:
 *         description: Lista de operaciones
 */
router.get("/transactions", getTransactions);

/**
 * @swagger
 * /api/transfers:
 *   post:
 *     summary: Transfiere dinero a otro usuario por alias
 *     tags: [Operaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toAlias, currency, amount]
 *             properties:
 *               toAlias:
 *                 type: string
 *                 example: juan.nexa
 *               currency:
 *                 type: string
 *                 example: USD
 *               amount:
 *                 type: number
 *                 example: 50
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transferencia realizada (devuelve el movimiento del emisor)
 *       400:
 *         description: Moneda no soportada, monto inválido, saldo insuficiente o transferencia a uno mismo
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Destinatario no encontrado
 */
router.post("/transfers", transfer);

export default router;