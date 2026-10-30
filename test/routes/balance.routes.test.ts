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
 * Durante estas pruebas usamos billeteras en memoria.
 * Evitamos consultar PostgreSQL y utilizamos el
 * identificador simulado del usuario como walletId.
 */
vi.mock("../../src/utils/currentUser", () => ({
  getWalletId: async (res: any) => {
    return res.locals.userId;
  },
}));


import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("rutas de saldos", () => {
  it("GET /api/balances devuelve un saldo por moneda", async () => {
    const res = await request(app).get("/api/balances");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
  });

  it("GET /api/balances/usd devuelve el saldo de USD", async () => {
    const res = await request(app).get("/api/balances/usd");
    expect(res.status).toBe(200);
    expect(res.body.currencyCode).toBe("USD");
  });

  it("GET /api/balances/XYZ responde 400", async () => {
    const res = await request(app).get("/api/balances/XYZ");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Moneda no soportada");
  });

  it("GET /api/balances/total devuelve el total en USD", async () => {
    const res = await request(app).get("/api/balances/total");
    expect(res.status).toBe(200);
    expect(res.body.baseCurrency).toBe("USD");
    expect(res.body.total).toBeCloseTo(1092.51, 1);
  });

  it("GET /api/balances/total?base=XYZ responde 400", async () => {
    const res = await request(app).get("/api/balances/total?base=XYZ");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Moneda base no soportada");
  });
});