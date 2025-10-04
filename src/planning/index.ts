import { randomUUID } from "crypto";
import { analyzeCodebase } from "../analyzer/index";
import llmClient from "../llm/index";
import { CreatePlanRequest, PlanResponse } from "../schemas/plan.schema";
import logger from "../utils/logger";

/**
 * Main planning orchestration function that coordinates codebase analysis and LLM plan generation
 * @param request - The plan generation request containing task description and codebase configuration
 * @returns Promise<PlanResponse> - Complete plan response with metadata and timing information
 */
export async function generatePlan(
  request: CreatePlanRequest
): Promise<PlanResponse> {
  // Initialize tracking
  const planId = randomUUID();
  const startTime = Date.now();

  logger.info("Plan generation started", {
    planId,
    taskDescription:
      request.taskDescription.substring(0, 100) +
      (request.taskDescription.length > 100 ? "..." : ""),
    codebasePath: request.codebasePath,
  });

  try {
    // Phase 1: Codebase Analysis
    const analysisStartTime = Date.now();

    logger.info("Starting codebase analysis", {
      planId,
      codebasePath: request.codebasePath,
    });

    const analysisResult = await analyzeCodebase({
      codebasePath: request.codebasePath,
      includeFileTree: request.includeFileTree,
      maxDepth: request.maxDepth,
      excludePatterns: request.excludePatterns,
    });

    const analysisEndTime = Date.now();
    const analysisTime = analysisEndTime - analysisStartTime;
    const fileCount = analysisResult.summary.totalFiles;

    logger.info("Codebase analysis completed", {
      planId,
      analysisTime,
      fileCount,
    });

    // Phase 2: Plan Generation via LLM
    const planningStartTime = Date.now();

    logger.info("Starting LLM plan generation", { planId });

    const planContent = await llmClient.generatePlan(
      request.taskDescription,
      analysisResult,
      undefined // Use default provider and model
    );

    const planningEndTime = Date.now();
    const planningTime = planningEndTime - planningStartTime;

    logger.info("LLM plan generation completed", {
      planId,
      planningTime,
      planLength: planContent.length,
    });

    // Build PlanResponse
    const planResponse: PlanResponse = {
      id: planId,
      taskDescription: request.taskDescription,
      plan: planContent,
      codebasePath: request.codebasePath,
      createdAt: new Date().toISOString(),
      metadata: {
        fileCount,
        analysisTime,
        planningTime,
      },
    };

    const totalTime = Date.now() - startTime;

    logger.info("Plan generation successful", {
      planId,
      totalTime,
      fileCount,
      analysisTime,
      planningTime,
    });

    return planResponse;
  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error("Plan generation failed", {
      planId,
      totalTime,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Determine which phase failed and provide descriptive error
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Check for authentication/API key errors
      if (
        errorMessage.includes("authentication") ||
        errorMessage.includes("api key") ||
        errorMessage.includes("invalid") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("401")
      ) {
        throw new Error(
          "Authentication failed: Please check your LLM provider API keys in the environment configuration. Ensure at least one provider (OpenAI, Anthropic, or DeepSeek) has a valid API key."
        );
      }

      // Check for quota/rate limit errors
      if (
        errorMessage.includes("quota") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429") ||
        errorMessage.includes("exceeded")
      ) {
        throw new Error(
          "Rate limit or quota exceeded: Your LLM provider usage limits have been reached. Please check your billing status or try again later."
        );
      }

      // Check for provider configuration errors
      if (
        errorMessage.includes("no llm providers") ||
        errorMessage.includes("providers are configured") ||
        errorMessage.includes("all configured llm providers failed")
      ) {
        throw new Error(
          "LLM configuration error: No properly configured LLM providers found. Please ensure at least one provider (OpenAI, Anthropic, or DeepSeek) is configured with a valid API key."
        );
      }

      if (
        error.message.includes("analyzer") ||
        error.message.includes("analyzeCodebase")
      ) {
        throw new Error(`Codebase analysis failed: ${error.message}`);
      } else if (
        error.message.includes("llm") ||
        error.message.includes("plan generation")
      ) {
        throw new Error(`Plan generation failed: ${error.message}`);
      } else {
        // Generic analyzer or LLM error - try to determine from context
        const errorString = error.message.toLowerCase();
        if (
          errorString.includes("file") ||
          errorString.includes("directory") ||
          errorString.includes("parse")
        ) {
          throw new Error(`Codebase analysis failed: ${error.message}`);
        } else {
          throw new Error(`Plan generation failed: ${error.message}`);
        }
      }
    }

    throw new Error(`Plan generation failed: ${String(error)}`);
  }
}

// Export as default for convenience
export default generatePlan;

