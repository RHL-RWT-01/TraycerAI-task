// Common TypeScript interfaces and types for the application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  details?: any;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: PaginationParams;
}

export interface PlanRequest {
  // Will be used by subsequent phases for plan generation requests
  codebasePath?: string;
  analysisType?: string;
  requirements?: string[];
}

// Simple analysis interfaces for planning
export interface ProjectInfo {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
}

export interface Summary {
  totalFiles: number;
  totalDirectories: number;
  filesByExtension: Record<string, number>;
  estimatedComplexity: "low" | "medium" | "high" | "very high";
}

export interface AnalysisContext {
  fileTree?: string[];
  insights?: string[];
  patterns?: string[];
}

export interface AnalysisResponse {
  codebasePath: string;
  projectInfo: ProjectInfo;
  summary: Summary;
  context?: AnalysisContext;
}

