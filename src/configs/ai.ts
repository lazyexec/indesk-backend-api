import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import env from "./env";

type AIProvider = "gemini" | "openai" | "claude";
type AIMessageRole = "system" | "user" | "assistant";

interface AIMessage {
  role: AIMessageRole;
  content: string;
}

interface GenerateTextOptions {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

let geminiClient: GoogleGenerativeAI | null = null;
let claudeClient: Anthropic | null = null;

const getProvider = (): AIProvider => {
  const provider = (env.ai_api.provider || "gemini").toLowerCase();
  if (provider === "gemini" || provider === "openai" || provider === "claude") {
    return provider;
  }
  throw new Error(`Unsupported AI provider "${provider}"`);
};

const getGeminiClient = () => {
  if (!env.ai_api.gemini) {
    throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(env.ai_api.gemini);
  }

  return geminiClient;
};

const getClaudeClient = () => {
  if (!env.ai_api.claude) {
    throw new Error("ANTHROPIC_API_KEY is required when AI_PROVIDER=claude");
  }

  if (!claudeClient) {
    claudeClient = new Anthropic({ apiKey: env.ai_api.claude });
  }

  return claudeClient;
};

const cleanJsonText = (text: string) =>
  text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

const generateTextWithGemini = async (options: GenerateTextOptions) => {
  const systemMessage = options.messages.find((message) => message.role === "system");
  const conversationMessages = options.messages.filter((message) => message.role !== "system");

  const model = getGeminiClient().getGenerativeModel({
    model: options.model,
    systemInstruction: systemMessage?.content,
  });

  const contents =
    conversationMessages.length > 0
      ? conversationMessages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        }))
      : [{ role: "user" as const, parts: [{ text: "" }] }];

  const result = await model.generateContent({
    contents,
    generationConfig: {
      temperature: options.temperature,
      topP: options.topP,
      topK: options.topK,
      maxOutputTokens: options.maxOutputTokens,
      responseMimeType: options.responseMimeType,
    },
  });

  return result.response.text();
};

const generateTextWithClaude = async (options: GenerateTextOptions) => {
  const systemMessage = options.messages.find((message) => message.role === "system");
  const conversationMessages = options.messages.filter((message) => message.role !== "system");

  const messages =
    conversationMessages.length > 0
      ? conversationMessages.map((message) => ({
          role: (message.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
          content: message.content,
        }))
      : [{ role: "user" as const, content: "" }];

  const response = await getClaudeClient().messages.create({
    model: options.model,
    system: systemMessage?.content,
    messages,
    temperature: options.temperature,
    top_p: options.topP,
    max_tokens: options.maxOutputTokens || 4096,
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return text;
};

const generateText = async (options: GenerateTextOptions) => {
  const provider = getProvider();

  if (provider === "gemini") {
    const text = await generateTextWithGemini(options);
    return { text };
  }

  if (provider === "openai") {
    throw new Error("AI_PROVIDER=openai is not implemented yet. Add OpenAI SDK integration in src/configs/ai.ts.");
  }

  const text = await generateTextWithClaude(options);
  return { text };
};

const generateJson = async <T>(options: GenerateTextOptions): Promise<T> => {
  const response = await generateText({
    ...options,
    responseMimeType: options.responseMimeType || "application/json",
  });

  const cleanedText = cleanJsonText(response.text);

  try {
    return JSON.parse(cleanedText) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse AI JSON response: ${(error as Error).message}. Raw response: ${cleanedText.slice(0, 400)}`
    );
  }
};

export default {
  generateText,
  generateJson,
};
