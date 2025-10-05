import { PlanResponse } from "../schemas/plan.schema";

/**
 * Interface that extends PlanResponse with additional storage-specific fields
 */
export interface StoredPlan extends PlanResponse {
  status: "completed" | "failed";
}

/**
 * Interface for index file entries with metadata for fast listing
 */
export interface PlanIndexEntry {
  id: string; // UUID
  taskDescription: string; // for quick preview
  createdAt: string; // ISO timestamp
  status: "completed" | "failed";
}

/**
 * Interface for the index file structure
 */
export interface PlanIndex {
  plans: PlanIndexEntry[];
  lastUpdated: string; // ISO timestamp
  totalCount: number;
}

/**
 * Interface for listing parameters
 */
export interface ListPlansOptions {
  page: number; // default 1
  limit: number; // default 10, max 100
  sortBy?: "createdAt";
  sortOrder?: "asc" | "desc";
}

/**
 * Interface for list response
 */
export interface ListPlansResult {
  plans: StoredPlan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

