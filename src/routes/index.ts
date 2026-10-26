import { Router } from "express";
import balanceRoutes from "./balance.routes";
import currencyRoutes from "./currency.routes";

const router = Router();

router.use(currencyRoutes);
router.use(balanceRoutes);

export default router;