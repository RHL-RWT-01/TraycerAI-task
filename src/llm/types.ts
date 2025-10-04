// Type definitions for the LLM module

export type LLMProvider = "openai" | "anthropic" | "deepseek";

export interface LLMModel {
  provider: LLMProvider;
  model: string; // e.g., 'gpt-4', 'claude-3-opus-20240229'
  maxTokens: number; // default output token limit
  temperature: number; // 0-1, creativity level
}

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  model: LLMModel;
  maxRetries?: number;
  retryDelay?: number;
  isFallbackAttempt?: boolean;
}

export interface LLMResponse {
  content: string; // the generated text
  provider: LLMProvider;
  model: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason?: string; // 'stop', 'length', 'content_filter'
}

export interface ILLMProvider {
  generateCompletion(request: LLMRequest): Promise<LLMResponse>;
  isConfigured(): boolean; // checks if API key is available
  getProviderName(): LLMProvider;
}

export class LLMError extends Error {
  public provider: LLMProvider;
  public statusCode?: number;
  public retryable: boolean;

  constructor(
    message: string,
    provider: LLMProvider,
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.name = "LLMError";
    this.provider = provider;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

