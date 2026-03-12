import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// Reusable validation schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(200).trim(),
});

export const territoryIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const abnSchema = z.object({
  abn: z.string().regex(/^\d{11}$/, "ABN must be exactly 11 digits"),
});

export const businessSearchSchema = z.object({
  q: z.string().min(1).max(200).trim().optional(),
  name: z.string().min(1).max(200).trim().optional(),
  location: z.string().max(200).trim().optional(),
  state: z.string().max(3).trim().optional(),
  postcode: z.string().regex(/^\d{4}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const miningSearchSchema = z.object({
  q: z.string().min(2).max(200).trim().optional(),
  holder: z.string().max(200).optional(),
  status: z.string().max(50).optional(),
  tenementType: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Validation middleware factory for query parameters
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    req.query = result.data as any;
    next();
  };
}

// Validation middleware factory for path parameters
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid path parameters",
        details: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    req.params = result.data as any;
    next();
  };
}
