import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Types for API requests and responses
export interface CreatePlanRequest {
  taskDescription: string;
}

export interface PlanResponse {
  id: string;
  taskDescription: string;
  plan: string;
  createdAt: string;
  planningTime: number;
  status?: "completed" | "failed";
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListPlansQuery {
  page?: number;
  limit?: number;
  sortBy?: "createdAt";
  sortOrder?: "asc" | "desc";
}

// API functions
export const api = {
  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response = await apiClient.get("/health");
    return response.data;
  },

  // Plan endpoints
  async createPlan(
    request: CreatePlanRequest
  ): Promise<ApiResponse<PlanResponse>> {
    const response = await apiClient.post("/api/plans", request);
    return response.data;
  },

  async getPlan(id: string): Promise<ApiResponse<PlanResponse>> {
    const response = await apiClient.get(`/api/plans/${id}`);
    return response.data;
  },

  async listPlans(
    query: ListPlansQuery = {}
  ): Promise<PaginatedResponse<PlanResponse[]>> {
    const params = new URLSearchParams();
    if (query.page) params.append("page", query.page.toString());
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.sortBy) params.append("sortBy", query.sortBy);
    if (query.sortOrder) params.append("sortOrder", query.sortOrder);

    const response = await apiClient.get(`/api/plans?${params}`);
    return response.data;
  },
};

// Error handling utility
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return "An unexpected error occurred";
};

