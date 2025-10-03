import cors from "cors";
import express from "express";
import morgan from "morgan";
import config from "./config";
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
        analysis: "/api/analysis",
        createPlan: "POST /api/plans",
        analyzeCodebase: "POST /api/analysis",
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
const server = app.listen(config.port, () => {
  logger.info(` Planning Layer API server running on port ${config.port}`);
  logger.info(` Environment: ${config.nodeEnv}`);
  logger.info(` Health check: http://localhost:${config.port}/health`);
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

