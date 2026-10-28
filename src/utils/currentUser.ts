import { Response } from "express";
import { AppError } from "./appError";

// Id del usuario autenticado, puesto por authMiddleware.
// Mientras la wallet viva en memoria, el id del usuario hace de id de wallet.
export const getWalletId = (res: Response): string => {
  const userId = res.locals.userId;
  if (typeof userId !== "string" || userId === "") {
    throw new AppError("No autenticado", 401);
  }
  return userId;
};
