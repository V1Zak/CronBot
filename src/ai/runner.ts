import Anthropic from "@anthropic-ai/sdk";

export interface AiRequest {
  prompt: string;
  model: string;
  system?: string;
  max_tokens?: number;
  output_format?: "text" | "json";
  mockResponse?: unknown;
}

export interface AiResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
}

export class AiRunner {
  private readonly client?: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  async run(request: AiRequest): Promise<unknown> {
    // Mock support for testing without API keys
    if (request.mockResponse !== undefined) {
      return request.mockResponse;
    }

    if (!this.client) {
      throw new Error("ANTHROPIC_API_KEY is required for live AI runs. Set it in your .env file.");
    }

    const systemParts = [request.system ?? "You are a helpful AI assistant working within an automation pipeline."];
    if (request.output_format === "json") {
      systemParts.push("You MUST respond with valid JSON only. No markdown fences, no explanation text outside the JSON.");
    }

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.max_tokens ?? 4096,
      system: systemParts.join("\n\n"),
      messages: [{ role: "user", content: request.prompt }],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const result: AiResult = {
      text,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      model: response.model,
    };

    // For JSON output format, try to parse
    if (request.output_format === "json") {
      try {
        return JSON.parse(text);
      } catch {
        return result;
      }
    }

    return result;
  }
}
