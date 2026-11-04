import { vi } from "vitest";

// Simula una sesión válida (la verificación real se prueba en wallet.seguridad.test.ts).
vi.mock("../../src/auth/auth.middleware", () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    res.locals.userId = req.header("x-user-id") ?? "usuario-prueba";
    next();
  },
}));

// En los tests la billetera es el id simulado (en producción consulta PostgreSQL).
vi.mock("../../src/utils/currentUser", () => ({
  getWalletId: async (res: any) => res.locals.userId,
}));

// Nunca se llama a la API real: el proveedor se simula.
const { ask } = vi.hoisted(() => ({ ask: vi.fn() }));
vi.mock("../../src/services/ai.provider", () => ({
  geminiProvider: { ask },
}));

import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { AI_CONFIG } from "../../src/config/ai";

const post = (user: string, body: unknown) =>
  request(app).post("/api/ai/chat").set("x-user-id", user).send(body as object);

describe("POST /api/ai/chat", () => {
  beforeEach(() => {
    ask.mockReset();
    ask.mockResolvedValue("Tienes 520 USD disponibles.");
  });

  it("responde con el texto del asistente y le pasa los datos del usuario", async () => {
    const res = await post("usuario-chat-1", { message: "¿Cuánto tengo?" });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Tienes 520 USD disponibles.");

    const input = ask.mock.calls[0][0];
    expect(input.system).toContain("<datos_del_usuario>");
    expect(input.messages.at(-1)).toEqual({ role: "user", content: "¿Cuánto tengo?" });
  });

  it("acepta el historial de la conversación", async () => {
    const res = await post("usuario-chat-2", {
      message: "¿Y en pesos?",
      history: [
        { role: "user", content: "¿Cuánto tengo?" },
        { role: "assistant", content: "Tienes 520 USD." },
      ],
    });

    expect(res.status).toBe(200);
    expect(ask.mock.calls[0][0].messages).toHaveLength(3);
  });

  it("responde 400 si falta el mensaje", async () => {
    const res = await post("usuario-chat-3", {});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("El mensaje es obligatorio");
    expect(ask).not.toHaveBeenCalled();
  });

  it("responde 400 si el mensaje es demasiado largo", async () => {
    const res = await post("usuario-chat-4", {
      message: "a".repeat(AI_CONFIG.maxMessageLength + 1),
    });

    expect(res.status).toBe(400);
  });

  it("responde 503 si el proveedor falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    ask.mockRejectedValue(new Error("boom"));

    const res = await post("usuario-chat-5", { message: "hola" });

    expect(res.status).toBe(503);
    expect(res.body.error).toBe("El asistente no está disponible en este momento");
  });

  it("limita las consultas por usuario", async () => {
    for (let i = 0; i < AI_CONFIG.rateLimitMax; i++) {
      const ok = await post("usuario-limite", { message: "hola" });
      expect(ok.status).toBe(200);
    }

    const limited = await post("usuario-limite", { message: "hola" });

    expect(limited.status).toBe(429);
    // Otro usuario no se ve afectado.
    const other = await post("usuario-libre", { message: "hola" });
    expect(other.status).toBe(200);
  });
});