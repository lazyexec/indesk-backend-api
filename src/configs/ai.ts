import { GoogleGenerativeAI } from "@google/generative-ai";
import env from "./env";

const genAI = new GoogleGenerativeAI(env.ai_api.gemini || "");

export default {
    async generateText(options: {
        model: string;
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    }) {
        const model = genAI.getGenerativeModel({ model: options.model });

        // Convert messages to Gemini format
        const systemMessage = options.messages.find(m => m.role === "system");
        const conversationMessages = options.messages.filter(m => m.role !== "system");

        // Build the prompt with system context
        let prompt = "";
        if (systemMessage) {
            prompt += `${systemMessage.content}\n\n`;
        }

        // Add conversation history
        conversationMessages.forEach(msg => {
            if (msg.role === "user") {
                prompt += `User: ${msg.content}\n`;
            } else if (msg.role === "assistant") {
                prompt += `Assistant: ${msg.content}\n`;
            }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { text };
    },
};
