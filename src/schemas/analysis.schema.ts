import { z } from "zod";

// Analyze Codebase Request Schema
export const AnalyzeCodebaseRequestSchema = z.object({
  codebasePath: z.string().min(1, "Codebase path is required"),
  includeFileTree: z.boolean().optional().default(true),
  maxDepth: z
    .number()
    .min(1, "Max depth must be at least 1")
    .max(10, "Max depth cannot exceed 10")
    .optional()
    .default(5),
  excludePatterns: z
    .array(z.string())
    .optional()
    .default(["node_modules", "dist", ".git", ".vscode", ".idea", "coverage"]),
  fileExtensions: z
    .array(z.string())
    .optional()
    .default([".ts", ".js", ".tsx", ".jsx", ".json", ".md"]),
});

// Analysis Response Schema
export const AnalysisResponseSchema = z.object({
  codebasePath: z.string(),
  summary: z.object({
    totalFiles: z.number(),
    totalDirectories: z.number(),
    filesByExtension: z.record(z.string(), z.number()),
    estimatedComplexity: z.enum(["low", "medium", "high"]),
  }),
  fileTree: z
    .array(
      z.object({
        path: z.string(),
        type: z.enum(["file", "directory"]),
        size: z.number().optional(), // size in bytes for files
      })
    )
    .optional(),
  projectInfo: z.object({
    name: z.string().optional(),
    version: z.string().optional(),
    dependencies: z.record(z.string(), z.string()).optional(),
  }),
  analyzedAt: z.string().datetime("Invalid ISO date format"),
});

// TypeScript types inferred from schemas
export type AnalyzeCodebaseRequest = z.infer<
  typeof AnalyzeCodebaseRequestSchema
>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
