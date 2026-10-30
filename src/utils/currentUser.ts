
/**
 * Obtiene el ID real de la billetera del usuario autenticado.
 *
 * El middleware de autenticación guarda el ID del usuario
 * en res.locals.userId.
 *
 * Buscamos su billetera correspondiente en PostgreSQL.
 */

import { Response } from "express";
import pool from "../config/database";
import { AppError } from "./appError";

export const getWalletId = async (res: Response): Promise<string> => {
  // Obtener el ID del usuario autenticado.
  const userId = res.locals.userId;

  if (typeof userId !== "string" || userId === "") {
    throw new AppError("No autenticado", 401);
  }

  // Buscar la billetera asociada al usuario.
  const result = await pool.query(
    `SELECT id
     FROM wallets
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError("El usuario no tiene una billetera", 404);
  }

  return result.rows[0].id;
};
