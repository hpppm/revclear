import { Request, Response, NextFunction } from "express";
import { getUserOrganization } from "../utils/organization";
import { AppError } from "../utils/AppError";

export const requireOrganization = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user) {
            throw new AppError("User not authenticated", 401);
        }

        const organization = await getUserOrganization(req.user.id);
        if (!organization) {
            throw new AppError("User must join or create an organization first", 400);
        }

        req.organization = organization as any;
        next();
    } catch (error) {
        next(error);
    }
};
