import OpenAI from "openai";
import config from "../../config";
import logger from "../../utils/logger";
import { ILLMProvider, LLMError, LLMRequest, LLMResponse } from "../types";

export class DeepSeekProvider implements ILLMProvider {
  private client: OpenAI;

  constructor() {
    // DeepSeek uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: config.deepseekApiKey,
      baseURL: "https://api.deepseek.com",
      dangerouslyAllowBrowser: false,
    });

    if (this.isConfigured()) {
      logger.info("DeepSeek provider initialized successfully");
    } else {
      logger.warn("DeepSeek provider initialized but API key not configured");
    }
  }

  isConfigured(): boolean {
    return !!config.deepseekApiKey;
  }

  getProviderName(): "deepseek" {
    return "deepseek";
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new LLMError(
        "DeepSeek API key not configured",
        "deepseek",
        undefined,
        false
      );
    }

    try {
      // Build messages array
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (request.systemPrompt) {
        messages.push({
          role: "system",
          content: request.systemPrompt,
        });
      }

      messages.push({
        role: "user",
        content: request.prompt,
      });

      logger.debug("DeepSeek API request", {
        model: request.model.model,
        messageCount: messages.length,
        maxTokens: request.model.maxTokens,
        temperature: request.model.temperature,
      });

      const completion = await this.client.chat.completions.create({
        model: request.model.model,
        messages,
        max_tokens: request.model.maxTokens,
        temperature: request.model.temperature,
        stream: false,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new LLMError(
          "No content returned from DeepSeek API",
          "deepseek",
          undefined,
          true
        );
      }

      logger.debug("DeepSeek API response", {
        model: completion.model,
        finishReason: completion.choices[0]?.finish_reason,
        tokensUsed: completion.usage,
      });

      return {
        content,
        provider: "deepseek",
        model: completion.model || request.model.model,
        tokensUsed: completion.usage
          ? {
              prompt: completion.usage.prompt_tokens,
              completion: completion.usage.completion_tokens,
              total: completion.usage.total_tokens,
            }
          : undefined,
        finishReason: completion.choices[0]?.finish_reason || undefined,
      };
    } catch (error: any) {
      // Handle DeepSeek API errors
      if (error?.response?.status) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;

        logger.error("DeepSeek API error", {
          status,
          message,
          retryable: this.isRetryableError(status),
        });

        throw new LLMError(
          `DeepSeek API error: ${status} ${message}`,
          "deepseek",
          status,
          this.isRetryableError(status)
        );
      }

      // Handle network and other errors
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        logger.error("DeepSeek connection error", {
          code: error.code,
          message: error.message,
        });

        throw new LLMError(
          `DeepSeek connection failed: ${error.message}`,
          "deepseek",
          undefined,
          true
        );
      }

      // Handle OpenAI SDK errors (since DeepSeek uses compatible API)
      if (error.status) {
        logger.error("DeepSeek API error", {
          status: error.status,
          message: error.message,
          retryable: this.isRetryableError(error.status),
        });

        throw new LLMError(
          `DeepSeek API error: ${error.status} ${error.message}`,
          "deepseek",
          error.status,
          this.isRetryableError(error.status)
        );
      }

      // Generic error
      logger.error("DeepSeek unexpected error", error);
      throw new LLMError(
        `DeepSeek unexpected error: ${error.message}`,
        "deepseek",
        undefined,
        false
      );
    }
  }

  private isRetryableError(status: number): boolean {
    // Retry on server errors, rate limits, and timeouts
    return (
      status >= 500 || // Server errors
      status === 429 || // Rate limit
      status === 408 || // Request timeout
      status === 502 || // Bad gateway
      status === 503 || // Service unavailable
      status === 504 // Gateway timeout
    );
  }
}

// Export singleton instance
export default new DeepSeekProvider();
