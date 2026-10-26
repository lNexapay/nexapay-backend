import { beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

// Aquí NO se simula la sesión: se usa el middleware real.
// Sin token responde 401 antes de consultar la base de datos.
describe("wallet: rutas privadas exigen sesión", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "secreto-solo-para-pruebas";
  });

  const privadas: Array<[string, string]> = [
    ["get", "/api/balances"],
    ["get", "/api/balances/USD"],
    ["get", "/api/balances/total"],
    ["post", "/api/deposit"],
    ["post", "/api/convert"],
    ["get", "/api/transactions"],
  ];

  it.each(privadas)("%s %s sin token responde 401", async (metodo, ruta) => {
    const res = await (request(app) as any)[metodo](ruta);
    expect(res.status).toBe(401);
  });

  it("con un token inválido responde 401", async () => {
    const res = await request(app)
      .get("/api/balances")
      .set("Authorization", "Bearer token-falso");
    expect(res.status).toBe(401);
  });

  it("un depósito sin sesión no modifica nada", async () => {
    const res = await request(app).post("/api/deposit").send({ currency: "USD", amount: 1000 });
    expect(res.status).toBe(401);
  });

  it("monedas y tasas siguen siendo públicas", async () => {
    expect((await request(app).get("/api/currencies")).status).toBe(200);
    expect((await request(app).get("/api/rates")).status).toBe(200);
  });
});
