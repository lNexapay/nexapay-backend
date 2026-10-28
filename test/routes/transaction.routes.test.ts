import { vi } from "vitest";

// Simula una sesión válida: la verificación real (JWT + base de datos)
// se prueba aparte en wallet.seguridad.test.ts.
vi.mock("../../src/auth/auth.middleware", () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    res.locals.userId = req.header("x-user-id") ?? "usuario-prueba";
    next();
  },
}));

/**
 * Simula la búsqueda de la billetera durante los tests.
 *
 * En producción getWalletId consulta PostgreSQL.
 * En estas pruebas utilizamos el repositorio en memoria,
 * por eso devolvemos directamente el ID simulado.
 */
vi.mock("../../src/utils/currentUser", () => ({
  getWalletId: async (res: any) => {
    return res.locals.userId;
  },
}));


import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("rutas de operaciones", () => {
  it("POST /api/deposit acredita saldo", async () => {
    const res = await request(app).post("/api/deposit").send({ currency: "USD", amount: 50 });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("deposit");
  });

  it("POST /api/convert convierte USD a COP", async () => {
    const res = await request(app).post("/api/convert").send({ from: "USD", to: "COP", amount: 100 });
    expect(res.status).toBe(201);
    expect(res.body.amountTo).toBe(316187);
  });

  it("POST /api/convert sin saldo suficiente responde 400", async () => {
    const res = await request(app).post("/api/convert").send({ from: "USD", to: "COP", amount: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Saldo insuficiente");
  });

  it("GET /api/transactions devuelve el historial", async () => {
    const res = await request(app).get("/api/transactions");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});