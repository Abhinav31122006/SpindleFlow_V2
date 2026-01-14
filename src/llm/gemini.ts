import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider, LLMGenerateParams } from "./provider";

export class GeminiProvider implements LLMProvider {
  name = "gemini";
  private client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(params: LLMGenerateParams): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: "gemini-flash-latest", // ✅ AVAILABLE IN YOUR PROJECT
    });

    const result = await model.generateContent(
      `${params.system}\n\n${params.user}`
    );

    return result.response.text();
  }
}
