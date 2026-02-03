import { GoogleGenAI } from "@google/genai";
import env from "./env";

export default new GoogleGenAI({ apiKey: env.ai_api.gemini });
