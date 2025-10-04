import Anthropic from "@anthropic-ai/sdk";
import config from "../../config";
import logger from "../../utils/logger";
import { ILLMProvider, LLMError, LLMRequest, LLMResponse } from "../types";

export class AnthropicProvider implements ILLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    if (this.isConfigured()) {
      logger.info("Anthropic provider initialized successfully");
    } else {
      logger.warn("Anthropic provider initialized but API key not configured");
    }
  }

  isConfigured(): boolean {
    return !!config.anthropicApiKey;
  }

  getProviderName(): "anthropic" {
    return "anthropic";
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new LLMError(
        "Anthropic API key not configured",
        "anthropic",
        undefined,
        false
      );
    }

    try {
      // Format prompt for Anthropic (older SDK version)
      const formattedPrompt = request.systemPrompt
        ? `${request.systemPrompt}\n\nHuman: ${request.prompt}\n\nAssistant:`
        : `Human: ${request.prompt}\n\nAssistant:`;

      // Call Anthropic API
      const response = await this.client.completions.create({
        model: request.model.model,
        max_tokens_to_sample: request.model.maxTokens,
        temperature: request.model.temperature,
        prompt: formattedPrompt,
      });

      // Extract response content
      const completionText = response.completion;
      if (!completionText || typeof completionText !== "string") {
        throw new LLMError(
          "No text content received from Anthropic API",
          "anthropic",
          undefined,
          true
        );
      }

      // Build LLM response
      const llmResponse: LLMResponse = {
        content: completionText,
        provider: "anthropic",
        model: request.model.model,
        tokensUsed: {
          prompt: 0, // Anthropic v0.12.0 doesn't provide detailed token usage
          completion: 0,
          total: 0,
        },
        finishReason: response.stop_reason || undefined,
      };

      logger.info("Anthropic completion successful", {
        model: request.model.model,
        tokensUsed: llmResponse.tokensUsed,
        finishReason: llmResponse.finishReason,
      });

      return llmResponse;
    } catch (error: any) {
      // Handle Anthropic API errors
      if (error instanceof Anthropic.APIError) {
        const statusCode = error.status;
        let retryable = false;

        // Determine if error is retryable
        if (
          statusCode === 429 ||
          statusCode === 529 ||
          statusCode === 500 ||
          statusCode === 502 ||
          statusCode === 503
        ) {
          retryable = true;
        }

        logger.error("Anthropic API error", {
          status: statusCode,
          message: error.message,
          retryable,
        });

        throw new LLMError(
          `Anthropic API error: ${error.message}`,
          "anthropic",
          statusCode,
          retryable
        );
      }

      // Handle other errors
      logger.error("Unexpected error in Anthropic provider", error);
      throw new LLMError(
        `Unexpected error: ${error.message}`,
        "anthropic",
        undefined,
        false
      );
    }
  }
}

export default new AnthropicProvider();

