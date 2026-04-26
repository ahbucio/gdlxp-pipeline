import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(new AppError(404, `${req.method} ${req.path} not found`, "NOT_FOUND"));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      code: err.code,
    });
    return;
  }

  console.error("[Unhandled error]", err);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error",
    code: "INTERNAL_ERROR",
  });
}