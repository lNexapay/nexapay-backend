import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("GET /api/fees", () => {
  it("es público y devuelve las comisiones por par", async () => {
    const res = await request(app).get("/api/fees");

    expect(res.status).toBe(200);
    expect(res.body.conversion).toHaveLength(12);
    expect(res.body.transfer).toHaveProperty("percent");
  });
});