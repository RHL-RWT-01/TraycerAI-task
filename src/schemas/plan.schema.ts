import { z } from "zod";

// Create Plan Request Schema
export const CreatePlanRequestSchema = z.object({
  taskDescription: z
    .string()
    .min(10, "Task description must be at least 10 characters")
    .max(2000, "Task description cannot exceed 2000 characters"),
});

// Plan Response Schema
export const PlanResponseSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
  taskDescription: z.string(),
  plan: z.string(), // Markdown formatted plan
  createdAt: z.string().datetime("Invalid ISO date format"),
  planningTime: z.number(), // in milliseconds
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
  sortBy: z.enum(["createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// TypeScript types inferred from schemas
export type CreatePlanRequest = z.infer<typeof CreatePlanRequestSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
export type StoredPlan = z.infer<typeof StoredPlanSchema>;
export type GetPlanParams = z.infer<typeof GetPlanParamsSchema>;
export type ListPlansQuery = z.infer<typeof ListPlansQuerySchema>;

