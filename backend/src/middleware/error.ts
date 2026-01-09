import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

const isDevelopment = process.env.NODE_ENV === "development";

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    // Operational errors (expected) - return message to client
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // Validation errors - return structured validation feedback
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            })),
        });
    }

    // Log unexpected errors server-side (never expose to client)
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, isDevelopment ? err : err.message);

    // Generic error response - never leak internal details
    return res.status(500).json({
        success: false,
        message: "An unexpected error occurred",
    });
};
