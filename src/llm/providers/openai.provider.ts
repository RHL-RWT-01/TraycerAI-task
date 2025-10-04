import OpenAI from "openai";
import config from "../../config";
import logger from "../../utils/logger";
import { ILLMProvider, LLMError, LLMRequest, LLMResponse } from "../types";

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
      dangerouslyAllowBrowser: false,
    });

    if (this.isConfigured()) {
      logger.info("OpenAI provider initialized successfully");
    } else {
      logger.warn("OpenAI provider initialized but API key not configured");
    }
  }

  isConfigured(): boolean {
    return !!config.openaiApiKey;
  }

  getProviderName(): "openai" {
    return "openai";
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new LLMError(
        "OpenAI API key not configured",
        "openai",
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

      // Call OpenAI API
      const response = await this.client.chat.completions.create({
        model: request.model.model,
        messages,
        max_tokens: request.model.maxTokens,
        temperature: request.model.temperature,
      });

      // Extract response content
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new LLMError(
          "No content received from OpenAI API",
          "openai",
          undefined,
          true
        );
      }

      // Build LLM response
      const llmResponse: LLMResponse = {
        content,
        provider: "openai",
        model: request.model.model,
        tokensUsed: response.usage
          ? {
              prompt: response.usage.prompt_tokens,
              completion: response.usage.completion_tokens,
              total: response.usage.total_tokens,
            }
          : undefined,
        finishReason: response.choices[0]?.finish_reason || undefined,
      };

      logger.info("OpenAI completion successful", {
        model: request.model.model,
        tokensUsed: llmResponse.tokensUsed,
        finishReason: llmResponse.finishReason,
      });

      return llmResponse;
    } catch (error: any) {
      // Handle OpenAI API errors
      if (error instanceof OpenAI.APIError) {
        const statusCode = error.status;
        let retryable = false;

        // Determine if error is retryable
        if (
          statusCode === 429 ||
          statusCode === 500 ||
          statusCode === 502 ||
          statusCode === 503
        ) {
          retryable = true;
        }

        logger.error("OpenAI API error", {
          status: statusCode,
          message: error.message,
          retryable,
        });

        throw new LLMError(
          `OpenAI API error: ${error.message}`,
          "openai",
          statusCode,
          retryable
        );
      }

      // Handle other errors
      logger.error("Unexpected error in OpenAI provider", error);
      throw new LLMError(
        `Unexpected error: ${error.message}`,
        "openai",
        undefined,
        false
      );
    }
  }
}

export default new OpenAIProvider();
