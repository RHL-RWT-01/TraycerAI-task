import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  openaiApiKey: string | undefined;
  anthropicApiKey: string | undefined;
  deepseekApiKey: string | undefined;
  logLevel: string;
  apiPrefix: string;
  // LLM Configuration
  defaultLlmProvider: "openai" | "anthropic" | "deepseek";
  openaiModel: string;
  anthropicModel: string;
  deepseekModel: string;
  llmMaxTokens: number;
  llmTemperature: number;
  llmMaxRetries: number;
  llmRetryDelay: number;
  llmEnableFallback: boolean;
}

const config: Config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  logLevel: process.env.LOG_LEVEL || "info",
  apiPrefix: process.env.API_PREFIX || "/api",
  // LLM Configuration
  defaultLlmProvider:
    (process.env.DEFAULT_LLM_PROVIDER as "openai" | "anthropic" | "deepseek") ||
    "openai",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-sonnet-20240229",
  deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || "4096", 10),
  llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
  llmMaxRetries: parseInt(process.env.LLM_MAX_RETRIES || "3", 10),
  llmRetryDelay: parseInt(process.env.LLM_RETRY_DELAY || "1000", 10),
  llmEnableFallback: process.env.LLM_ENABLE_FALLBACK !== "false",
};

// Validate required environment variables
const requiredEnvVars = ["PORT"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  console.error(
    "Please copy .env.example to .env and configure the required variables."
  );
}

export default config;

