
import { NextFunction, Request, Response } from "express";
import { transactionService } from "../services/transaction.service";
import { getWalletId } from "../utils/currentUser";

export const deposit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currency, amount, description } = req.body;
    const walletId = await getWalletId(res);

    const tx = await transactionService.deposit(
      String(currency).toUpperCase(),
      amount,
      description,
      walletId
    );

    res.status(201).json(tx);
  } catch (error) {
    next(error);
  }
};

export const convert = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { from, to, amount, description } = req.body;
    const walletId = await getWalletId(res);

    const tx = await transactionService.convert(
      String(from).toUpperCase(),
      String(to).toUpperCase(),
      amount,
      description,
      walletId
    );

    res.status(201).json(tx);
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const walletId = await getWalletId(res);

    res.json(await transactionService.getHistory(walletId, limit));
  } catch (error) {
    next(error);
  }
};

export const transfer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { toAlias, currency, amount, description } = req.body;
    const walletId = await getWalletId(res);

    const tx = await transactionService.transfer(
      toAlias,
      String(currency).toUpperCase(),
      amount,
      description,
      walletId
    );

    res.status(201).json(tx);
  } catch (error) {
    next(error);
  }
};
