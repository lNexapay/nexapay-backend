import { AI_CONFIG } from "../config/ai";
import { AppError } from "../utils/appError";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Contrato del proveedor: cambiar de proveedor es escribir otro archivo con esta forma.
export interface AiProvider {
  ask(input: { system: string; messages: ChatMessage[] }): Promise<string>;
}

export const geminiProvider: AiProvider = {
  async ask({ system, messages }) {
    // Evita gastar la clave si un test olvida simular el proveedor.
    if (process.env.NODE_ENV === "test") {
      throw new AppError("El asistente está desactivado en las pruebas", 503);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError("El asistente no está configurado", 503);
    }

    try {
      // La librería es un módulo ES: se carga con import() dinámico, y solo al usarla,
      // así la app arranca aunque falte la clave.
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          timeout: 4_000,
          retryOptions: {
            attempts: 3,
            initialDelay: 0.5,
            maxDelay: 1,
            expBase: 2,
            jitter: 0.2,
            httpStatusCodes: [503],
          },
        },
      });

      const response = await ai.models.generateContent({
        model: AI_CONFIG.model,
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        config: {
          systemInstruction: system,
          maxOutputTokens: AI_CONFIG.maxOutputTokens,
        },
      });

      return response.text ?? "";
    } catch (error: any) {
      if (error?.status === 429) {
        throw new AppError(
          "Estoy atendiendo muchas consultas. Inténtalo de nuevo en un momento.",
          429
        );
      }
      throw error;
    }
  },
};