import { NextFunction, Request, Response } from "express";
import { balanceService } from "../services/balance.service";
import { getWalletId } from "../utils/currentUser";

export const getBalances = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.json(await balanceService.getBalances(getWalletId(res)));
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
    res.json(await balanceService.getBalance(currency, getWalletId(res)));
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
    const base = req.query.base ? String(req.query.base).toUpperCase() : "USD";
    res.json(await balanceService.getTotalBalance(getWalletId(res), base));
  } catch (error) {
    next(error);
  }
};