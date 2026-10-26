import { Router } from "express";
import balanceRoutes from "./balance.routes";
import currencyRoutes from "./currency.routes";
import transactionRoutes from "./transaction.routes";

const router = Router();

router.use(currencyRoutes);
router.use(balanceRoutes);
router.use(transactionRoutes);

export default router;