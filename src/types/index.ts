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
}

export interface PlanRequest {
  // Will be used by subsequent phases for plan generation requests
  codebasePath?: string;
  analysisType?: string;
  requirements?: string[];
}

export interface AnalysisResult {
  // Will be used by subsequent phases for codebase analysis results
  files?: string[];
  structure?: any;
  complexity?: number;
  recommendations?: string[];
}
