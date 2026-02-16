import { Request, Response, NextFunction } from "express";
import { z } from "zod";

import { ERROR_CODES } from "../utils/errorCodes";

/**
 * Middleware для валидации request данных с помощью Zod schemas
 */
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        }));

        return res.status(400).json({
          error: {
            code: ERROR_CODES.KYC_VALIDATION_ERROR,
            message: "Validation failed",
            details: errors,
          },
        });
      }
      next(error);
    }
  };
};
