import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.middleware";
import validateRequest from "../middleware/validate.middleware";
import { generatePlan } from "../planning";
import {
    CreatePlanRequest,
    CreatePlanRequestSchema,
    GetPlanParamsSchema,
    ListPlansQuery,
    ListPlansQuerySchema,
} from "../schemas/plan.schema";
import { getPlanById, listPlans, savePlan } from "../storage";
import { ApiResponse, PaginatedResponse } from "../types";
import logger from "../utils/logger";

const plansRouter = Router();

// POST / - Create plan
plansRouter.post(
  "/",
  validateRequest(CreatePlanRequestSchema, "body"),
  asyncHandler(async (req, res) => {
    logger.info("Plan creation request received", {
      requestData: req.validated?.body,
    });

    // Extract validated request data
    const requestData = req.validated?.body as CreatePlanRequest;

    // Call the planning module to generate the plan
    const planResponse = await generatePlan(requestData);

    // Persist the plan to storage
    try {
      await savePlan(planResponse, "completed");
      logger.info("Plan persisted to storage", { planId: planResponse.id });
    } catch (error) {
      // Log error but don't fail the request
      logger.error("Failed to persist plan to storage", {
        planId: planResponse.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Build success response
    const response: ApiResponse = {
      success: true,
      message: "Plan generated successfully",
      data: planResponse,
    };

    res.json(response);
  })
);

// GET /:id - Get plan by ID
plansRouter.get(
  "/:id",
  validateRequest(GetPlanParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const planId = req.validated?.params?.id;

    logger.info("Plan retrieval request received", {
      planId,
    });

    // Retrieve plan from storage
    const storedPlan = await getPlanById(planId!);

    if (!storedPlan) {
      logger.info("Plan not found", { planId });
      const response: ApiResponse = {
        success: false,
        message: "Plan not found",
        error: "No plan exists with the provided ID",
      };
      return res.status(404).json(response);
    }

    logger.info("Plan retrieved successfully", { planId });
    const response: ApiResponse = {
      success: true,
      message: "Plan retrieved successfully",
      data: storedPlan,
    };

    res.json(response);
  })
);

// GET / - List all plans
plansRouter.get(
  "/",
  validateRequest(ListPlansQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const queryParams = req.validated?.query as ListPlansQuery;

    logger.info("Plan listing request received", {
      page: queryParams.page,
      limit: queryParams.limit,
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
    });

    // Retrieve plans from storage
    const result = await listPlans(queryParams);

    logger.info("Plans retrieved successfully", {
      page: queryParams.page,
      limit: queryParams.limit,
      total: result.pagination.total,
      returned: result.plans.length,
    });

    // Build paginated response
    const response: PaginatedResponse<typeof result.plans> = {
      success: true,
      message: "Plans retrieved successfully",
      data: result.plans,
      pagination: result.pagination,
    };

    res.json(response);
  })
);

export default plansRouter;

