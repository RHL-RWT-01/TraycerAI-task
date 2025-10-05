import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";
import { ErrorResponse } from "../types";
import logger from "../utils/logger";

// Extend Express Request type to include validated data
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

type ValidationSource = "body" | "query" | "params";

export const validateRequest = (
  schema: ZodSchema,
  source: ValidationSource = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract data from the specified source
      const data = req[source];

      // Validate using the provided schema
      const validatedData = schema.parse(data);

      // Attach validated data to request object
      if (!req.validated) {
        req.validated = {};
      }
      req.validated[source] = validatedData;

      // Continue to next middleware
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Log validation error
        logger.warn(`Validation failed for ${source}:`, error.errors);

        const validationErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        // Return 400 with validation details
        const errorResponse: ErrorResponse = {
          statusCode: 400,
          message: "Validation failed",
          validationErrors,
        };

        return res.status(400).json(errorResponse);
      } else {
        // Log unexpected error
        logger.error("Unexpected validation error:", error);

        // Return 500 for other errors
        const errorResponse: ErrorResponse = {
          statusCode: 500,
          message: "Internal server error during validation",
        };

        return res.status(500).json(errorResponse);
      }
    }
  };
};

export default validateRequest;

