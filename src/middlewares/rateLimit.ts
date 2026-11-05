import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";

// Límite simple en memoria (una sola instancia del servidor).
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  keyOf: (req: Request, res: Response) => string;
  message?: string;
}) => {
  const hits = new Map<string, number[]>();
  let lastSweep = Date.now();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();

    // Una vez por ventana se descartan los usuarios sin consultas recientes,
    // para que el mapa no crezca indefinidamente.
    if (now - lastSweep >= options.windowMs) {
      for (const [key, times] of hits) {
        if (times.every((time) => now - time >= options.windowMs)) {
          hits.delete(key);
        }
      }
      lastSweep = now;
    }

    const key = options.keyOf(req, res);
    const recent = (hits.get(key) ?? []).filter(
      (time) => now - time < options.windowMs
    );

    if (recent.length >= options.max) {
      hits.set(key, recent);
      return next(
        new AppError(
          options.message ?? "Demasiadas peticiones. Inténtalo de nuevo en un momento.",
          429
        )
      );
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
};
