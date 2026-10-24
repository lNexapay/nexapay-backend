import { Request, Response } from "express";
import { currencyService } from "../services/currency.service";

export const getCurrencies = (_req: Request, res: Response) => {
  res.json(currencyService.getCurrencies());
};

export const getRates = (_req: Request, res: Response) => {
  res.json(currencyService.getRatesInfo());
};