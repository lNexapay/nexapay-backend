import { Request, Response } from "express";
import { feeService } from "../services/fee.service";

export const getFees = (_req: Request, res: Response) => {
  res.json(feeService.getFeeTable());
};