import cors from "cors";
import express from "express";
import morgan from "morgan";
import config from "./config";
import llmClient from "./llm/client";
import router from "./routes";
import { ApiResponse, ErrorResponse } from "./types";
import logger from "./utils/logger";

const app = express();

// Middleware
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes

const API_PREFIX = config.apiPrefix;
app.use(API_PREFIX, router);

// Health check endpoint
app.get("/health", (req, res) => {
  const response: ApiResponse = {
    success: true,
    message: "Planning Layer API is running",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: "1.0.0",
    },
  };
  res.json(response);
});

// Root endpoint
app.get("/", (req, res) => {
  const response: ApiResponse = {
    success: true,
    message: "Welcome to Planning Layer API",
    data: {
      description:
        "REST API service that generates planning layer for coding agents",
      endpoints: {
        health: "/health",
        plans: "/api/plans",
        createPlan: "POST /api/plans",
        getPlan: "GET /api/plans/:id",
        listPlans: "GET /api/plans",
      },
    },
  };
  res.json(response);
});

// 404 handler
app.use("*", (req, res) => {
  const errorResponse: ErrorResponse = {
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
  };
  res.status(404).json(errorResponse);
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Unhandled error:", err);

    const errorResponse: ErrorResponse = {
      statusCode: 500,
      message: "Internal server error",
      details: config.nodeEnv === "development" ? err.message : undefined,
    };

    res.status(500).json(errorResponse);
  }
);

// Start server
const server = app.listen(config.port, async () => {
  logger.info(` Planning Layer API server running on port ${config.port}`);
  logger.info(` Environment: ${config.nodeEnv}`);
  logger.info(` Health check: http://localhost:${config.port}/health`);

  // Validate LLM providers on startup
  try {
    logger.info("Validating LLM provider configurations...");
    const validation = await llmClient.validateProviders();

    if (validation.working.length === 0) {
      logger.warn("⚠️  No working LLM providers found!");
      logger.warn(
        "⚠️  The API will not be able to generate plans until at least one provider is properly configured."
      );
      logger.warn(
        "⚠️  Please check your API keys in the environment configuration."
      );

      if (validation.configured.length > 0) {
        logger.info("Configured but failing providers:");
        Object.entries(validation.errors).forEach(([provider, error]) => {
          logger.info(`  - ${provider}: ${error}`);
        });
      } else {
        logger.info(
          "No LLM providers are configured. Please set API keys for:"
        );
        logger.info("  - OPENAI_API_KEY for OpenAI");
        logger.info("  - ANTHROPIC_API_KEY for Anthropic");
        logger.info("  - DEEPSEEK_API_KEY for DeepSeek");
      }
    } else {
      logger.info(
        `✅ ${
          validation.working.length
        } working LLM provider(s): ${validation.working.join(", ")}`
      );

      if (Object.keys(validation.errors).length > 0) {
        logger.warn("Some providers have issues:");
        Object.entries(validation.errors).forEach(([provider, error]) => {
          logger.warn(`  - ${provider}: ${error}`);
        });
      }
    }
  } catch (error) {
    logger.error("Failed to validate LLM providers:", error);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

export default app;

