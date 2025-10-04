import { promises as fs } from "fs";
import path from "path";
import { PlanResponse } from "../schemas/plan.schema";
import logger from "../utils/logger";
import {
    ListPlansOptions,
    ListPlansResult,
    PlanIndex,
    PlanIndexEntry,
    StoredPlan,
} from "./types";

// Constants
const STORAGE_DIR = "data/plans";
const INDEX_FILE = "data/plans/index.json";
const MAX_PAGE_LIMIT = 100;

/**
 * Ensure storage directories exist and initialize index file if needed
 */
export async function ensureStorageDirectory(): Promise<void> {
  try {
    // Create directories recursively
    await fs.mkdir("data", { recursive: true });
    await fs.mkdir(STORAGE_DIR, { recursive: true });

    // Check if index file exists, create if not
    try {
      await fs.access(INDEX_FILE);
    } catch {
      const emptyIndex: PlanIndex = {
        plans: [],
        lastUpdated: new Date().toISOString(),
        totalCount: 0,
      };
      await fs.writeFile(INDEX_FILE, JSON.stringify(emptyIndex, null, 2));
      logger.info("Initialized storage index file", { indexFile: INDEX_FILE });
    }

    logger.info("Storage directory ensured", { storageDir: STORAGE_DIR });
  } catch (error) {
    logger.error("Failed to ensure storage directory", {
      error: error instanceof Error ? error.message : String(error),
      storageDir: STORAGE_DIR,
    });
    throw error;
  }
}

/**
 * Read the index file
 */
export async function readIndex(): Promise<PlanIndex> {
  try {
    const indexData = await fs.readFile(INDEX_FILE, "utf-8");
    return JSON.parse(indexData) as PlanIndex;
  } catch (error) {
    logger.warn("Failed to read index file, returning empty index", {
      error: error instanceof Error ? error.message : String(error),
      indexFile: INDEX_FILE,
    });
    return {
      plans: [],
      lastUpdated: new Date().toISOString(),
      totalCount: 0,
    };
  }
}

/**
 * Write the index file
 */
export async function writeIndex(index: PlanIndex): Promise<void> {
  try {
    // Update timestamp
    index.lastUpdated = new Date().toISOString();

    // Use atomic write pattern: write to temp file, then rename
    const tempFile = `${INDEX_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(index, null, 2));
    await fs.rename(tempFile, INDEX_FILE);

    logger.info("Index file updated", {
      indexFile: INDEX_FILE,
      totalCount: index.totalCount,
    });
  } catch (error) {
    logger.error("Failed to write index file", {
      error: error instanceof Error ? error.message : String(error),
      indexFile: INDEX_FILE,
    });
    throw error;
  }
}

/**
 * Save a plan to storage
 */
export async function savePlan(
  planResponse: PlanResponse,
  status: "completed" | "failed" = "completed"
): Promise<StoredPlan> {
  try {
    // Ensure storage directory exists
    await ensureStorageDirectory();

    // Build StoredPlan object
    const storedPlan: StoredPlan = {
      ...planResponse,
      status,
    };

    // Write plan to file
    const planFile = path.join(STORAGE_DIR, `${planResponse.id}.json`);
    await fs.writeFile(planFile, JSON.stringify(storedPlan, null, 2));

    // Create new index entry
    const indexEntry: PlanIndexEntry = {
      id: planResponse.id,
      taskDescription: planResponse.taskDescription,
      codebasePath: planResponse.codebasePath,
      createdAt: planResponse.createdAt,
      status,
      fileCount: planResponse.metadata.fileCount,
    };

    // Update index with retry logic to handle concurrent writes
    const maxRetries = 5;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Read fresh index right before writing to get latest data
        const index = await readIndex();

        // Check if entry already exists (idempotency)
        const existingIndex = index.plans.findIndex(
          (entry) => entry.id === planResponse.id
        );
        if (existingIndex >= 0) {
          // Update existing entry
          index.plans[existingIndex] = indexEntry;
        } else {
          // Add new entry
          index.plans.push(indexEntry);
        }

        index.totalCount = index.plans.length;

        // Write updated index
        await writeIndex(index);

        // Success - break out of retry loop
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          // Final attempt failed
          throw lastError;
        }

        // Wait with exponential backoff before retry
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        logger.warn(
          `Index update attempt ${attempt} failed, retrying in ${delay}ms`,
          {
            planId: planResponse.id,
            error: lastError.message,
            attempt,
            maxRetries,
          }
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    logger.info("Plan saved successfully", {
      planId: planResponse.id,
      status,
      fileCount: planResponse.metadata.fileCount,
    });

    return storedPlan;
  } catch (error) {
    logger.error("Failed to save plan", {
      planId: planResponse.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Failed to save plan: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get a plan by ID
 */
export async function getPlanById(id: string): Promise<StoredPlan | null> {
  try {
    // Basic UUID validation
    if (!id || id.length !== 36 || !id.includes("-")) {
      logger.warn("Invalid UUID format", { id });
      return null;
    }

    // Construct file path
    const planFile = path.join(STORAGE_DIR, `${id}.json`);

    // Check if file exists
    try {
      await fs.access(planFile);
    } catch {
      logger.info("Plan not found", { planId: id });
      return null;
    }

    // Read and parse file
    const planData = await fs.readFile(planFile, "utf-8");
    const storedPlan = JSON.parse(planData) as StoredPlan;

    logger.info("Plan retrieved successfully", { planId: id });
    return storedPlan;
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error("Failed to parse plan JSON", {
        planId: id,
        error: error.message,
      });
      return null;
    }

    logger.error("Failed to retrieve plan", {
      planId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * List plans with pagination
 */
export async function listPlans(
  options: ListPlansOptions
): Promise<ListPlansResult> {
  try {
    // Validate and normalize options
    const page = Math.max(1, options.page);
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, options.limit));
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "desc";

    // Read index
    const index = await readIndex();

    // Sort index entries
    const sortedEntries = [...index.plans].sort((a, b) => {
      let comparison = 0;

      if (sortBy === "createdAt") {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "fileCount") {
        comparison = a.fileCount - b.fileCount;
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    // Calculate pagination
    const totalPages = Math.ceil(index.totalCount / limit);
    const skip = (page - 1) * limit;
    const pageEntries = sortedEntries.slice(skip, skip + limit);

    // Load full plans for the current page
    const plans: StoredPlan[] = [];
    for (const entry of pageEntries) {
      const plan = await getPlanById(entry.id);
      if (plan) {
        plans.push(plan);
      }
    }

    const result: ListPlansResult = {
      plans,
      pagination: {
        page,
        limit,
        total: index.totalCount,
        totalPages,
      },
    };

    logger.info("Plans listed successfully", {
      page,
      limit,
      total: index.totalCount,
      returned: plans.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to list plans", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Return empty result on error
    return {
      plans: [],
      pagination: {
        page: options.page,
        limit: options.limit,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Delete a plan (bonus function for future use)
 */
export async function deletePlan(id: string): Promise<boolean> {
  try {
    // Delete plan file
    const planFile = path.join(STORAGE_DIR, `${id}.json`);

    try {
      await fs.unlink(planFile);
    } catch {
      logger.info("Plan file not found for deletion", { planId: id });
      return false;
    }

    // Read index and remove entry
    const index = await readIndex();
    const initialCount = index.plans.length;
    index.plans = index.plans.filter((entry) => entry.id !== id);

    if (index.plans.length === initialCount) {
      logger.warn("Plan not found in index", { planId: id });
      return false;
    }

    index.totalCount = index.plans.length;
    await writeIndex(index);

    logger.info("Plan deleted successfully", { planId: id });
    return true;
  } catch (error) {
    logger.error("Failed to delete plan", {
      planId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Initialize storage on module load
ensureStorageDirectory().catch((error) => {
  logger.error("Failed to initialize storage directory", {
    error: error instanceof Error ? error.message : String(error),
  });
});

// Default export object with all functions
export default {
  ensureStorageDirectory,
  savePlan,
  getPlanById,
  listPlans,
  deletePlan,
  readIndex,
  writeIndex,
};

