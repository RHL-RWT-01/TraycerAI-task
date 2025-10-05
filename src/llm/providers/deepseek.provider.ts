import OpenAI from "openai";
import config from "../../config";
import logger from "../../utils/logger";
import { ILLMProvider, LLMError, LLMRequest, LLMResponse } from "../types";

export class DeepSeekProvider implements ILLMProvider {
  private client: OpenAI;

  constructor() {
    // DeepSeek via OpenRouter uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: config.deepseekApiKey, // Use your OPENROUTER_API_KEY here
      baseURL: "https://openrouter.ai/api/v1", // OpenRouter endpoint
      defaultHeaders: {
        "HTTP-Referer": config.appUrl || "https://your-app-domain.com",
        "X-Title": "LLM Client",
      },
      dangerouslyAllowBrowser: false,
    });

    if (this.isConfigured()) {
      logger.info("DeepSeek (OpenRouter) provider initialized successfully");
    } else {
      logger.warn(
        "DeepSeek (OpenRouter) provider initialized but API key not configured"
      );
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
        "DeepSeek (OpenRouter) API key not configured",
        "deepseek",
        undefined,
        false
      );
    }

    try {
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

      logger.debug("DeepSeek (OpenRouter) request", {
        model: request.model.model,
        messageCount: messages.length,
        maxTokens: request.model.maxTokens,
        temperature: request.model.temperature,
      });

      const completion = await this.client.chat.completions.create({
        model: request.model.model || "deepseek/deepseek-coder",
        messages,
        max_tokens: request.model.maxTokens || 2048,
        temperature: request.model.temperature || 0.7,
        stream: false,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new LLMError(
          "No content returned from DeepSeek (OpenRouter)",
          "deepseek",
          undefined,
          true
        );
      }

      logger.debug("DeepSeek (OpenRouter) response", {
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
      const status = error?.response?.status || error?.status;
      const message =
        error?.response?.data?.error?.message || error.message || "Unknown error";

      logger.error("DeepSeek (OpenRouter) error", {
        status,
        message,
        retryable: this.isRetryableError(status),
      });

      throw new LLMError(
        `DeepSeek (OpenRouter) API error: ${status} ${message}`,
        "deepseek",
        status,
        this.isRetryableError(status)
      );
    }
  }

  private isRetryableError(status: number): boolean {
    return (
      status >= 500 ||
      status === 429 ||
      status === 408 ||
      status === 502 ||
      status === 503 ||
      status === 504
    );
  }
}

// Export singleton
export default new DeepSeekProvider();
