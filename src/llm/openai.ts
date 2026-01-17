import OpenAI from "openai";
import { LLMProvider, LLMGenerateParams } from "./provider";
import { RateLimiter } from "./rate-limiters";
import { logLLMCall, llmLogger } from "../logger/enhanced-logger";

export class OpenAIProvider implements LLMProvider {
  name = "openai";
  private client: OpenAI;
  private rateLimiter: RateLimiter;
  private model: string;

  constructor(apiKey: string, model?: string) {
    llmLogger.info("🔧 Initializing OpenAI Provider");

    if (!apiKey) {
      llmLogger.error("❌ OPENAI_API_KEY is not set");
      throw new Error("OPENAI_API_KEY is not set");
    }

    llmLogger.debug({
      event: "API_KEY_CHECK",
      keyPresent: true,
      keyLength: apiKey.length,
      keyPreview: `${apiKey.substring(0, 8)}...`,
    }, "✅ API key found");

    this.client = new OpenAI({ apiKey });
    this.model = model || "gpt-4o-mini";

    // Initialize rate limiter with 3 RPM (conservative for OpenAI)
    const rpm = parseInt(process.env.OPENAI_RPM || "3", 10);
    this.rateLimiter = new RateLimiter(rpm);

    llmLogger.info({
      event: "PROVIDER_INITIALIZED",
      provider: "openai",
      rateLimit: rpm,
      model: this.model,
    }, "✅ OpenAI Provider initialized");
  }

  async generate(params: LLMGenerateParams): Promise<string> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    llmLogger.info({
      event: "GENERATE_START",
      requestId,
      timestamp: startTime,
    }, `🚀 Starting LLM generation (${requestId})`);

    // Log input parameters
    llmLogger.debug({
      event: "GENERATE_PARAMS",
      requestId,
      systemPromptLength: params.system.length,
      userPromptLength: params.user.length,
      temperature: params.temperature,
      systemPrompt: params.system,
      userPrompt: params.user,
    }, `📋 Request parameters for ${requestId}`);

    // Acquire rate limit slot
    llmLogger.info({
      event: "RATE_LIMIT_CHECK",
      requestId,
      stats: this.rateLimiter.getStats(),
    }, `⏱️ Checking rate limit for ${requestId}`);

    await this.rateLimiter.acquireSlot();

    llmLogger.info({
      event: "RATE_LIMIT_ACQUIRED",
      requestId,
      waitTime: Date.now() - startTime,
    }, `✅ Rate limit slot acquired for ${requestId}`);

    try {
      // Make API call
      llmLogger.info({
        event: "API_CALL_START",
        requestId,
        timestamp: Date.now(),
      }, `📡 Sending request to OpenAI API (${requestId})`);

      logLLMCall("openai", requestId, {
        systemLength: params.system.length,
        userLength: params.user.length,
        temperature: params.temperature,
      }, "REQUEST");

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
        temperature: params.temperature || 0.7,
      });

      const apiCallDuration = Date.now() - startTime;

      llmLogger.info({
        event: "API_CALL_SUCCESS",
        requestId,
        duration: apiCallDuration,
        timestamp: Date.now(),
      }, `✅ Received response from OpenAI API (${requestId}) in ${apiCallDuration}ms`);

      // Extract response
      const responseText = response.choices[0].message.content || "";

      llmLogger.debug({
        event: "RESPONSE_EXTRACTED",
        requestId,
        responseLength: responseText.length,
        response: responseText,
      }, `📄 Response text extracted for ${requestId}`);

      logLLMCall("openai", requestId, {
        responseLength: responseText.length,
        duration: apiCallDuration,
        response: responseText,
      }, "RESPONSE");

      const totalDuration = Date.now() - startTime;

      llmLogger.info({
        event: "GENERATE_COMPLETE",
        requestId,
        totalDuration,
        apiCallDuration,
        overheadDuration: totalDuration - apiCallDuration,
      }, `🎉 Generation complete for ${requestId} (total: ${totalDuration}ms)`);

      return responseText;

    } catch (error) {
      const errorDuration = Date.now() - startTime;

      llmLogger.error({
        event: "API_CALL_ERROR",
        requestId,
        duration: errorDuration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, `❌ Error in LLM generation (${requestId})`);

      logLLMCall("openai", requestId, {
        error: error instanceof Error ? error.message : String(error),
        duration: errorDuration,
      }, "ERROR");

      throw error;
    }
  }
}
