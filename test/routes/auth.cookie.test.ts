import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";

// Se simula el servicio para no necesitar base de datos:
// aquí solo se comprueba cómo se emite la cookie de sesión.
vi.mock("../../src/auth/auth.service", () => ({
  registerUser: vi.fn(),
  getUserById: vi.fn(),
  loginUser: vi.fn().mockResolvedValue({
    token: "jwt-de-prueba",
    refreshToken: "refresh-de-prueba",
    user: { id: "u1", name: "Ana", email: "ana@test.com" },
  }),
}));

describe("cookie de sesión", () => {
  it("el login emite refreshToken HttpOnly con ruta /api", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@test.com", password: "Clave12345" });

    expect(res.status).toBe(200);
    const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
    const nueva = cookies.find((c) => c.startsWith("refreshToken=refresh-de-prueba"));

    expect(nueva).toBeDefined();
    expect(nueva).toContain("HttpOnly");
    // /api (y no /api/auth): authMiddleware exige esta cookie también en
    // las rutas de wallet, que cuelgan de /api. Con /api/auth esas rutas
    // devolverían "Sesión no encontrada" desde el navegador.
    expect(nueva).toMatch(/Path=\/api(;|$)/);
  });

  it("el login borra la cookie antigua de /api/auth", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@test.com", password: "Clave12345" });

    const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
    const vieja = cookies.find((c) => c.startsWith("refreshToken=;") && c.includes("Path=/api/auth"));
    expect(vieja).toBeDefined();
  });
});
