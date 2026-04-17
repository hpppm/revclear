import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";

const isDevelopment = process.env.NODE_ENV === "development";

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
        const isCorsOriginError =
            err.message === "Not allowed by CORS" ||
            err.message === "Origin header required";

        if (isCorsOriginError) {
            return res.status(403).json({
                error: "Origin not allowed",
            });
        }

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

    logger.error(
      { method: req.method, url: req.originalUrl, err: isDevelopment ? err : err.message },
      'Unhandled server error',
    );

    // Generic error response - never leak internal details
    return res.status(500).json({
        success: false,
        message: "An unexpected error occurred",
    });
};
