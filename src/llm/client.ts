import config from "../config";
import { AnalysisResponse } from "../types";
import logger from "../utils/logger";
import { parsePlanFromResponse, validatePlanStructure } from "./parser";
import {
  buildPlanGenerationPrompt,
  buildSimplePlanGenerationPrompt,
  buildSystemPrompt,
} from "./prompts/planGeneration.prompt";
import anthropicProvider from "./providers/anthropic.provider";
import deepseekProvider from "./providers/deepseek.provider";
import openaiProvider from "./providers/openai.provider";
import {
  ILLMProvider,
  LLMError,
  LLMModel,
  LLMProvider,
  LLMRequest,
  LLMResponse,
} from "./types";

const getDefaultModels = (): Record<LLMProvider, LLMModel> => ({
  openai: {
    provider: "openai",
    model: config.openaiModel,
    maxTokens: config.llmMaxTokens,
    temperature: config.llmTemperature,
  },
  anthropic: {
    provider: "anthropic",
    model: config.anthropicModel,
    maxTokens: config.llmMaxTokens,
    temperature: config.llmTemperature,
  },
  deepseek: {
    provider: "deepseek",
    model: config.deepseekModel,
    maxTokens: config.llmMaxTokens,
    temperature: config.llmTemperature,
  },
});

export class LLMClient {
  private providers: Map<LLMProvider, ILLMProvider>;
  private defaultProvider: LLMProvider;

  constructor() {
    // Initialize providers
    this.providers = new Map<LLMProvider, ILLMProvider>([
      ["openai", openaiProvider],
      ["anthropic", anthropicProvider],
      ["deepseek", deepseekProvider],
    ]);

    // Determine default provider from config or first available
    const availableProviders = this.getAvailableProviders();
    this.defaultProvider = availableProviders.includes(
      config.defaultLlmProvider
    )
      ? config.defaultLlmProvider
      : availableProviders[0] || "openai";

    logger.info("LLM Client initialized", {
      availableProviders,
      defaultProvider: this.defaultProvider,
      configuredProvider: config.defaultLlmProvider,
    });

    if (availableProviders.length === 0) {
      logger.warn(
        "No LLM providers are configured. Please set API keys in configuration."
      );
    }
  }

  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.entries())
      .filter(([, provider]) => provider.isConfigured())
      .map(([name]) => name);
  }

  selectProvider(preferredProvider?: LLMProvider): {
    provider: ILLMProvider;
    providerName: LLMProvider;
    model: LLMModel;
  } {
    let selectedProviderName: LLMProvider;
    let selectedProvider: ILLMProvider;

    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider);
      if (provider && provider.isConfigured()) {
        selectedProviderName = preferredProvider;
        selectedProvider = provider;
      } else {
        logger.warn(
          `Preferred provider ${preferredProvider} not available, falling back to default`
        );
        selectedProviderName = this.defaultProvider;
        selectedProvider = this.providers.get(this.defaultProvider)!;
      }
    } else {
      selectedProviderName = this.defaultProvider;
      selectedProvider = this.providers.get(this.defaultProvider)!;
    }

    if (!selectedProvider || !selectedProvider.isConfigured()) {
      throw new Error(
        "No LLM providers are available. Please configure API keys."
      );
    }

    return {
      provider: selectedProvider,
      providerName: selectedProviderName,
      model: getDefaultModels()[selectedProviderName],
    };
  }

  async generatePlanWithRetry(request: LLMRequest): Promise<LLMResponse> {
    // Try with primary provider first
    const { provider, providerName, model } = this.selectProvider(
      request.model.provider
    );

    try {
      return await this.tryProviderWithRetry(
        provider,
        providerName,
        model,
        request
      );
    } catch (error) {
      // If fallback is enabled and error is not from fallback attempt, try other providers
      if (
        config.llmEnableFallback &&
        error instanceof LLMError &&
        !request.isFallbackAttempt
      ) {
        logger.warn(
          `Primary provider ${providerName} failed, attempting fallback`,
          {
            error: error.message,
            statusCode: error.statusCode,
          }
        );

        const availableProviders = this.getAvailableProviders();
        const fallbackProviders = availableProviders.filter(
          (p) => p !== providerName
        );

        for (const fallbackProviderName of fallbackProviders) {
          try {
            logger.info(`Trying fallback provider: ${fallbackProviderName}`);

            const fallbackProvider = this.providers.get(fallbackProviderName)!;
            const fallbackModel = getDefaultModels()[fallbackProviderName];

            const fallbackRequest = {
              ...request,
              model: {
                ...fallbackModel,
                ...request.model,
                provider: fallbackProviderName,
                model: fallbackModel.model,
              },
              isFallbackAttempt: true,
            };

            const response = await this.tryProviderWithRetry(
              fallbackProvider,
              fallbackProviderName,
              fallbackModel,
              fallbackRequest
            );

            logger.info(
              `Fallback provider ${fallbackProviderName} succeeded after primary provider ${providerName} failed`
            );

            return response;
          } catch (fallbackError) {
            logger.warn(`Fallback provider ${fallbackProviderName} failed`, {
              error:
                fallbackError instanceof LLMError
                  ? fallbackError.message
                  : String(fallbackError),
            });
            continue;
          }
        }

        // All fallback providers failed
        const allErrors = {
          primary: {
            provider: providerName,
            error: error.message,
            statusCode: error.statusCode,
          },
        };

        logger.error("All providers failed including fallbacks", {
          primaryProvider: providerName,
          fallbackProviders,
          originalError: error.message,
          allErrors,
        });

        // Create comprehensive error message
        const configuredProviders = this.getAvailableProviders();
        if (configuredProviders.length === 0) {
          throw new LLMError(
            "No LLM providers are configured. Please check your API keys in the environment configuration.",
            providerName,
            undefined,
            false
          );
        } else {
          throw new LLMError(
            `All configured LLM providers failed. Primary provider ${providerName} failed with: ${
              error.message
            }. Fallback providers (${fallbackProviders.join(
              ", "
            )}) also failed. Please check your API keys and provider status.`,
            providerName,
            error.statusCode,
            false
          );
        }
      }

      // Re-throw original error if fallback is disabled or all providers failed
      throw error;
    }
  }

  private async tryProviderWithRetry(
    provider: ILLMProvider,
    providerName: LLMProvider,
    model: LLMModel,
    request: LLMRequest
  ): Promise<LLMResponse> {
    // Update request model to match the actual provider being used
    const updatedRequest: LLMRequest = {
      ...request,
      model: {
        ...model,
        ...request.model,
        provider: providerName,
        model: model.model, // Ensure we use the correct model ID for the selected provider
      },
    };

    const maxRetries = updatedRequest.maxRetries || config.llmMaxRetries;
    const baseDelay = updatedRequest.retryDelay || config.llmRetryDelay;

    let lastError: LLMError | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        logger.info(`LLM completion attempt ${attempt}/${maxRetries + 1}`, {
          provider: provider.getProviderName(),
          model: updatedRequest.model.model,
          isFallback: request.isFallbackAttempt || false,
        });

        const response = await provider.generateCompletion(updatedRequest);

        if (attempt > 1) {
          logger.info(`LLM completion succeeded after ${attempt} attempts`);
        }

        return response;
      } catch (error) {
        if (error instanceof LLMError) {
          lastError = error;

          logger.warn(`LLM completion attempt ${attempt} failed`, {
            provider: error.provider,
            statusCode: error.statusCode,
            retryable: error.retryable,
            message: error.message,
            isFallback: request.isFallbackAttempt || false,
          });

          // Don't retry if error is not retryable
          if (!error.retryable) {
            throw error;
          }

          // Don't retry if this was the last attempt
          if (attempt > maxRetries) {
            break;
          }

          // Calculate delay with exponential backoff
          const delay = baseDelay * Math.pow(2, attempt - 1);
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Unexpected error, don't retry
          logger.error("Unexpected error during LLM completion", error);
          const errorMessage =
            typeof error === "object" && error !== null && "message" in error
              ? String((error as { message: unknown }).message)
              : String(error);
          throw new LLMError(
            `Unexpected error: ${errorMessage}`,
            provider.getProviderName(),
            undefined,
            false
          );
        }
      }
    }

    // All retries exhausted
    throw (
      lastError ||
      new LLMError(
        "All retry attempts exhausted",
        provider.getProviderName(),
        undefined,
        false
      )
    );
  }

  // Overloaded method - with analysis
  async generatePlan(
    taskDescription: string,
    analysisResult: AnalysisResponse,
    options?: {
      provider?: LLMProvider;
      model?: Partial<LLMModel>;
    }
  ): Promise<string>;

  // Overloaded method - without analysis
  async generatePlan(
    taskDescription: string,
    options?: {
      provider?: LLMProvider;
      model?: Partial<LLMModel>;
    }
  ): Promise<string>;

  async generatePlan(
    taskDescription: string,
    analysisResultOrOptions?:
      | AnalysisResponse
      | {
          provider?: LLMProvider;
          model?: Partial<LLMModel>;
        },
    options?: {
      provider?: LLMProvider;
      model?: Partial<LLMModel>;
    }
  ): Promise<string> {
    const startTime = Date.now();

    // Determine if we have analysis result or just options
    let analysisResult: AnalysisResponse | null = null;
    let finalOptions: typeof options = options;

    if (analysisResultOrOptions && "codebasePath" in analysisResultOrOptions) {
      // First overload - we have analysis result
      analysisResult = analysisResultOrOptions;
    } else {
      // Second overload - no analysis, options passed as second parameter
      finalOptions = analysisResultOrOptions as typeof options;
    }

    logger.info("Starting plan generation", {
      taskLength: taskDescription.length,
      codebasePath: analysisResult?.codebasePath || "no-codebase",
      hasAnalysis: !!analysisResult,
      options: finalOptions,
    });

    try {
      // Select provider
      const selectedProvider = finalOptions?.provider || this.defaultProvider;

      // Get model configuration
      const baseModel = getDefaultModels()[selectedProvider];
      const model: LLMModel = {
        ...baseModel,
        ...finalOptions?.model,
        provider: selectedProvider,
      };

      // Build prompts
      const systemPrompt = buildSystemPrompt();
      const userPrompt = analysisResult
        ? buildPlanGenerationPrompt(taskDescription, analysisResult)
        : buildSimplePlanGenerationPrompt(taskDescription);

      // Create request
      const request: LLMRequest = {
        prompt: userPrompt,
        systemPrompt,
        model,
        maxRetries: config.llmMaxRetries,
        retryDelay: config.llmRetryDelay,
      };

      logger.info("Prompts built", {
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        model: model.model,
      });

      // Generate completion with retry
      const response = await this.generatePlanWithRetry(request);

      // Parse response
      const parsedPlan = parsePlanFromResponse(response.content);

      // Validate plan structure
      const validation = validatePlanStructure(parsedPlan);

      const duration = Date.now() - startTime;

      logger.info("Plan generation completed", {
        duration,
        provider: response.provider,
        model: response.model,
        tokensUsed: response.tokensUsed,
        planLength: parsedPlan.length,
        validationResult: validation,
      });

      return parsedPlan;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error("Plan generation failed", {
        duration,
        taskLength: taskDescription.length,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof LLMError) {
        throw new Error(
          `Plan generation failed (${error.provider}): ${error.message}`
        );
      }

      throw new Error(
        `Plan generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async testConnection(provider?: LLMProvider): Promise<boolean> {
    try {
      const testModel = getDefaultModels()[provider || this.defaultProvider];
      const request: LLMRequest = {
        prompt: 'Say "OK" if you can read this',
        model: testModel,
        maxRetries: 1,
        retryDelay: config.llmRetryDelay,
      };

      await this.generatePlanWithRetry(request);
      return true;
    } catch (error) {
      logger.warn("LLM connection test failed", {
        provider: provider || this.defaultProvider,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async validateProviders(): Promise<{
    configured: LLMProvider[];
    working: LLMProvider[];
    errors: Record<LLMProvider, string>;
  }> {
    const configured = this.getAvailableProviders();
    const working: LLMProvider[] = [];
    const errors: Record<LLMProvider, string> = {} as Record<
      LLMProvider,
      string
    >;

    logger.info("Validating LLM providers", { configured });

    for (const providerName of configured) {
      try {
        const isWorking = await this.testConnection(providerName);
        if (isWorking) {
          working.push(providerName);
          logger.info(`Provider ${providerName} validation successful`);
        } else {
          errors[providerName] = "Connection test failed";
          logger.warn(`Provider ${providerName} validation failed`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors[providerName] = errorMessage;
        logger.error(`Provider ${providerName} validation error`, {
          error: errorMessage,
        });
      }
    }

    const result = { configured, working, errors };

    if (working.length === 0) {
      logger.error("No working LLM providers found", result);
    } else {
      logger.info("Provider validation complete", result);
    }

    return result;
  }
}

// Export singleton instance
export default new LLMClient();

