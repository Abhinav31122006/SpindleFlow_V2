import { LLMProvider } from "./provider";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { ModelConfig } from "../config/schema";

export function getLLMProvider(
  modelConfig: ModelConfig,
  options?: { apiKey?: string }
): LLMProvider {
  const provider = modelConfig.provider;
  const model = modelConfig.model;

  // Resolve API key based on provider
  const apiKeyEnvVar = provider === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY";
  const resolvedApiKey = options?.apiKey || process.env[apiKeyEnvVar];

  if (!resolvedApiKey) {
    throw new Error(
      `No API key provided. Use --api-key or set ${apiKeyEnvVar}.`
    );
  }

  switch (provider) {
    case "openai":
      return new OpenAIProvider(resolvedApiKey, model);
    case "gemini":
      return new GeminiProvider(resolvedApiKey, model);
  }
}