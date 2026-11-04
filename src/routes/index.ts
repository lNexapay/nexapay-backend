
import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import balanceRoutes from "./balance.routes";
import currencyRoutes from "./currency.routes";
import transactionRoutes from "./transaction.routes";
import savingsSpaceRoutes from "./savings-space.routes";
import feeRoutes from "./fee.routes";

const router = Router();

// Públicas: catálogo de monedas y tasas.
router.use(currencyRoutes);

// Privadas: requieren sesión (JWT + cookie de sesión activa).
// El middleware deja el ID del usuario en res.locals.userId.
router.use(
  ["/balances", "/deposit", "/convert", "/transactions", "/transfers", "/spaces"],
  authMiddleware
);

router.use(balanceRoutes);
router.use(transactionRoutes);
router.use(savingsSpaceRoutes);

// Pública: comisiones vigentes para estimar el costo antes de convertir.
router.use(feeRoutes);

export default router;
