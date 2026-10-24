import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("rutas de monedas", () => {
  it("GET /api/currencies devuelve las 4 monedas", async () => {
    const res = await request(app).get("/api/currencies");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
  });

  it("GET /api/rates devuelve la base y las tasas", async () => {
    const res = await request(app).get("/api/rates");
    expect(res.status).toBe(200);
    expect(res.body.base).toBe("USD");
    expect(res.body.rates.COP).toBe(4000);
  });
});