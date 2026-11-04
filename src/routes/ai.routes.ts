import { Router } from "express";
import { AI_CONFIG } from "../config/ai";
import { chat } from "../controllers/ai.controller";
import { createRateLimiter } from "../middlewares/rateLimit";

const router = Router();

// El límite es por usuario: el id lo deja el authMiddleware en res.locals.userId.
const aiLimiter = createRateLimiter({
  windowMs: AI_CONFIG.rateLimitWindowMs,
  max: AI_CONFIG.rateLimitMax,
  keyOf: (_req, res) => String(res.locals.userId),
  message: "Estoy atendiendo muchas consultas. Inténtalo de nuevo en un momento.",
});

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Pregunta al asistente NEXAPAY AI sobre tu cuenta (solo consulta)
 *     tags: [Asistente]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 500
 *                 example: ¿Cuánto pagué de comisión en mi última conversión?
 *               history:
 *                 type: array
 *                 description: Últimos mensajes de la conversación (se usan hasta 10)
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Respuesta del asistente, en el campo reply
 *       400:
 *         description: Mensaje vacío o demasiado largo, o historial inválido
 *       401:
 *         description: No autenticado
 *       429:
 *         description: Demasiadas consultas
 *       503:
 *         description: El asistente no está disponible
 */
router.post("/ai/chat", aiLimiter, chat);

export default router;