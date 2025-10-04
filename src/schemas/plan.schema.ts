import { z } from "zod";

// Create Plan Request Schema
export const CreatePlanRequestSchema = z.object({
  taskDescription: z
    .string()
    .min(10, "Task description must be at least 10 characters")
    .max(2000, "Task description cannot exceed 2000 characters"),
  codebasePath: z.string().min(1, "Codebase path is required"),
  includeFileTree: z.boolean().optional().default(false),
  maxDepth: z
    .number()
    .min(1, "Max depth must be at least 1")
    .max(10, "Max depth cannot exceed 10")
    .optional()
    .default(5),
  excludePatterns: z
    .array(z.string())
    .optional()
    .default(["node_modules", ".git", "dist", "build"]),
});

// Plan Response Schema
export const PlanResponseSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
  taskDescription: z.string(),
  plan: z.string(), // Markdown formatted plan
  codebasePath: z.string(),
  createdAt: z.string().datetime("Invalid ISO date format"),
  metadata: z.object({
    fileCount: z.number(),
    analysisTime: z.number(), // in milliseconds
    planningTime: z.number(), // in milliseconds
  }),
});

// Stored Plan Schema - extends PlanResponse with status
export const StoredPlanSchema = PlanResponseSchema.extend({
  status: z.enum(["completed", "failed"]),
});

// Get Plan Parameters Schema
export const GetPlanParamsSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

// List Plans Query Schema for pagination
export const ListPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.enum(["createdAt", "fileCount"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// TypeScript types inferred from schemas
export type CreatePlanRequest = z.infer<typeof CreatePlanRequestSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
export type StoredPlan = z.infer<typeof StoredPlanSchema>;
export type GetPlanParams = z.infer<typeof GetPlanParamsSchema>;
export type ListPlansQuery = z.infer<typeof ListPlansQuerySchema>;

