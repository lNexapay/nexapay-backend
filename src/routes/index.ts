
import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import balanceRoutes from "./balance.routes";
import currencyRoutes from "./currency.routes";
import transactionRoutes from "./transaction.routes";
import savingsSpaceRoutes from "./savings-space.routes";

const router = Router();

// Públicas: catálogo de monedas y tasas.
router.use(currencyRoutes);

// Privadas: requieren sesión (JWT + cookie de sesión activa).
// El middleware deja el ID del usuario en res.locals.userId.
router.use(
  ["/balances", "/deposit", "/convert", "/transactions", "/spaces"],
  authMiddleware
);

router.use(balanceRoutes);
router.use(transactionRoutes);
router.use(savingsSpaceRoutes);

export default router;
