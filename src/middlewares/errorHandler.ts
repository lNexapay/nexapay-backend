import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  // Errores de Express/body-parser (JSON mal formado, cuerpo demasiado grande).
  const status =
    typeof err === "object" && err !== null
      ? (err as { status?: unknown }).status
      : undefined;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const type = (err as { type?: unknown }).type;
    const message =
      type === "entity.parse.failed"
        ? "JSON mal formado"
        : type === "entity.too.large"
          ? "El cuerpo de la petición es demasiado grande"
          : "Petición inválida";
    return res.status(status).json({ error: message });
  }
  console.error(err);
  return res.status(500).json({ error: "Error interno del servidor" });
};