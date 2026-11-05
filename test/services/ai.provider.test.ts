
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
    generateContent: vi.fn(),
    constructor: vi.fn(),
}));

vi.mock("@google/genai", () => ({
    GoogleGenAI: class {
        constructor(options: unknown) {
            mocks.constructor(options);
        }

        models = {
            generateContent: mocks.generateContent,
        };
    },
}));

import { geminiProvider } from "../../src/services/ai.provider";

describe("geminiProvider", () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.clearAllMocks();

        process.env.NODE_ENV = "development";
        process.env.GEMINI_API_KEY = "clave-ficticia";

        mocks.generateContent.mockResolvedValue({
            text: "Hola desde NexaPay",
        });
    });

    afterEach(() => {
        if (originalKey === undefined) {
            delete process.env.GEMINI_API_KEY;
        } else {
            process.env.GEMINI_API_KEY = originalKey;
        }

        process.env.NODE_ENV = originalEnv;
    });

    it("configura los reintentos para errores 503", async () => {
        await geminiProvider.ask({
            system: "Sos NexaPay AI",
            messages: [{ role: "user", content: "hola" }],
        });

        expect(mocks.constructor).toHaveBeenCalledWith({
            apiKey: "clave-ficticia",
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
    });

    it("devuelve la respuesta de Gemini", async () => {
        const reply = await geminiProvider.ask({
            system: "Sos NexaPay AI",
            messages: [{ role: "user", content: "hola" }],
        });

        expect(reply).toBe("Hola desde NexaPay");
    });

});

describe("reintentos HTTP del SDK de Gemini", () => {
    it("reintenta un 503 y devuelve la respuesta del segundo intento", async () => {
        // Importamos el SDK real, sin el mock de Vitest.
        const { GoogleGenAI } = await vi.importActual<
            typeof import("@google/genai")
        >("@google/genai");

        let attempts = 0;

        const fakeFetch = vi.fn(async () => {
            attempts++;

            if (attempts === 1) {
                return new Response(
                    JSON.stringify({
                        error: {
                            code: 503,
                            message: "Servicio temporalmente saturado",
                            status: "UNAVAILABLE",
                        },
                    }),
                    {
                        status: 503,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    candidates: [
                        {
                            content: {
                                role: "model",
                                parts: [{ text: "Hola desde Gemini" }],
                            },
                            finishReason: "STOP",
                        },
                    ],
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        });

        const ai = new GoogleGenAI({
            apiKey: "clave-ficticia",
            httpOptions: {
                timeout: 4_000,
                fetch: fakeFetch,
                retryOptions: {
                    attempts: 3,
                    initialDelay: 0.01,
                    maxDelay: 0.02,
                    expBase: 2,
                    jitter: 0,
                    httpStatusCodes: [503],
                },
            },
        });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: "hola",
        });

        expect(fakeFetch).toHaveBeenCalledTimes(2);
        expect(response.text).toBe("Hola desde Gemini");
    });
});
