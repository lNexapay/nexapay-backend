
import { NextFunction, Request, Response } from "express";
import { balanceService } from "../services/balance.service";
import { getWalletId } from "../utils/currentUser";

export const getBalances = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const walletId = await getWalletId(res);
    res.json(await balanceService.getBalances(walletId));
  } catch (error) {
    next(error);
  }
};

export const getBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currency = String(req.params.currency).toUpperCase();
    const walletId = await getWalletId(res);

    res.json(await balanceService.getBalance(currency, walletId));
  } catch (error) {
    next(error);
  }
};

export const getTotalBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const base = req.query.base
      ? String(req.query.base).toUpperCase()
      : "USD";

    const walletId = await getWalletId(res);

    res.json(await balanceService.getTotalBalance(walletId, base));
  } catch (error) {
    next(error);
  }
};
