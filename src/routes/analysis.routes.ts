import { Router } from "express";
import { analyzeCodebase } from "../analyzer";
import asyncHandler from "../middleware/asyncHandler.middleware";
import validateRequest from "../middleware/validate.middleware";
import { AnalyzeCodebaseRequestSchema } from "../schemas/analysis.schema";
import { ApiResponse } from "../types";
import logger from "../utils/logger";

const analysisRouter = Router();

// POST / - Analyze codebase
analysisRouter.post(
  "/",
  validateRequest(AnalyzeCodebaseRequestSchema, "body"),
  asyncHandler(async (req, res) => {
    logger.info("Codebase analysis request received", {
      requestData: req.validated?.body,
    });

    // Extract validated request data
    const requestData = req.validated?.body;

    // Perform actual codebase analysis
    const analysisResult = await analyzeCodebase(requestData);

    const response: ApiResponse = {
      success: true,
      message: "Codebase analysis completed successfully",
      data: analysisResult,
    };

    res.json(response);
  })
);

export default analysisRouter;

