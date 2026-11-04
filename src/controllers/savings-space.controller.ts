
import { Request, Response, NextFunction } from "express";
import { savingsSpaceService } from "../services/savings-space.service";

export const createSavingsSpace = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.userId;
        const { name, currencyCode, targetAmount } = req.body ?? {};

        const space = await savingsSpaceService.create(
            userId,
            name,
            currencyCode,
            targetAmount
        );

        res.status(201).json({
            message: "Espacio creado correctamente",
            space,
        });
    } catch (error) {
        next(error);
    }
};

export const getSavingsSpaces = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const spaces = await savingsSpaceService.list(res.locals.userId);

        res.status(200).json({ spaces });
    } catch (error) {
        next(error);
    }
};

export const getSavingsSpaceById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const space = await savingsSpaceService.getById(
            res.locals.userId,
            String(req.params.id)
        );

        res.status(200).json({ space });
    } catch (error) {
        next(error);
    }
};

export const depositToSavingsSpace = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.userId;
        const spaceId = String(req.params.id);
        const { amount } = req.body ?? {};

        const result = await savingsSpaceService.deposit(
            userId,
            spaceId,
            amount
        );

        res.status(200).json({
            message: "Dinero agregado al espacio correctamente",
            ...result,
        });
    } catch (error) {
        next(error);
    }
};

export const withdrawFromSavingsSpace = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.userId;
        const spaceId = String(req.params.id);
        const { amount } = req.body ?? {};

        const result = await savingsSpaceService.withdraw(
            userId,
            spaceId,
            amount
        );

        res.status(200).json({
            message: "Dinero retirado del espacio correctamente",
            ...result,
        });
    } catch (error) {
        next(error);
    }
};

export const getSavingsSpaceMovements = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.userId;
        const spaceId = String(req.params.id);

        const movements = await savingsSpaceService.getMovements(
            userId,
            spaceId
        );

        res.status(200).json({
            movements,
        });
    } catch (error) {
        next(error);
    }
};
