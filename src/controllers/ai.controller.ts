import { NextFunction, Request, Response } from "express";
import { aiService } from "../services/ai.service";
import { getWalletId } from "../utils/currentUser";

export const chat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, history } = req.body ?? {};
    const walletId = await getWalletId(res);

    const reply = await aiService.chat(message, history, walletId);
    res.json({ reply });
  } catch (error) {
    next(error);
  }
};