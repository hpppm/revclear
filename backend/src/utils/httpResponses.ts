import { Response } from "express";

export const buildErrorBody = (message: string, details?: unknown) => {
  return details !== undefined
    ? { success: false, error: message, details }
    : { success: false, error: message };
};

export const sendError = (
  res: Response,
  status: number,
  message: string,
  details?: unknown
) => {
  return res.status(status).json(buildErrorBody(message, details));
};
