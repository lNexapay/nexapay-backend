import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Se simulan los servicios para no necesitar base de datos ni llamar a Google:
// aquí solo se comprueba el contrato HTTP de POST /api/auth/google.
const { loginWithGoogle, GoogleAuthError } = vi.hoisted(() => {
  class GoogleAuthError extends Error {
    constructor(message: string, public readonly statusCode: number) {
      super(message);
    }
  }
  return { loginWithGoogle: vi.fn(), GoogleAuthError };
});

vi.mock("../../src/auth/google-auth.service", () => ({
  loginWithGoogle,
  GoogleAuthError,
}));

vi.mock("../../src/auth/auth.service", () => ({
  registerUser: vi.fn(),
  getUserById: vi.fn(),
  loginUser: vi.fn(),
}));

import app from "../../src/app";

const cookiesOf = (res: request.Response) =>
  ([] as string[]).concat(res.headers["set-cookie"] ?? []);

describe("POST /api/auth/google", () => {
  beforeEach(() => {
    loginWithGoogle.mockReset();
  });

  it("responde 400 si no se envía idToken", async () => {
    const res = await request(app).post("/api/auth/google").send({});

    expect(res.status).toBe(400);
    expect(loginWithGoogle).not.toHaveBeenCalled();
  });

  it("responde 400 si idToken no es un texto", async () => {
    const res = await request(app)
      .post("/api/auth/google")
      .send({ idToken: 123 });

    expect(res.status).toBe(400);
    expect(loginWithGoogle).not.toHaveBeenCalled();
  });

  it("devuelve el JWT y emite la cookie de sesión con ruta /api", async () => {
    loginWithGoogle.mockResolvedValue({
      token: "jwt-de-prueba",
      refreshToken: "refresh-de-prueba",
      user: {
        id: "u1",
        name: "Ana",
        email: "ana@test.com",
        account_number: "12345678",
      },
    });

    const res = await request(app)
      .post("/api/auth/google")
      .send({ idToken: "token-de-google" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("jwt-de-prueba");
    expect(res.body.user.email).toBe("ana@test.com");
    // El refresh token viaja solo en la cookie, nunca en el cuerpo.
    expect(res.body.refreshToken).toBeUndefined();

    const nueva = cookiesOf(res).find((c) =>
      c.startsWith("refreshToken=refresh-de-prueba")
    );
    expect(nueva).toBeDefined();
    expect(nueva).toContain("HttpOnly");
    expect(nueva).toMatch(/Path=\/api(;|$)/);
  });

  it("propaga 401 si Google rechaza el token", async () => {
    loginWithGoogle.mockRejectedValue(
      new GoogleAuthError("Token de Google inválido", 401)
    );

    const res = await request(app)
      .post("/api/auth/google")
      .send({ idToken: "token-malo" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Token de Google inválido");
  });

  it("propaga 409 si el correo ya tiene una cuenta tradicional", async () => {
    loginWithGoogle.mockRejectedValue(
      new GoogleAuthError("Ya existe una cuenta con este correo.", 409)
    );

    const res = await request(app)
      .post("/api/auth/google")
      .send({ idToken: "token-valido" });

    expect(res.status).toBe(409);
  });

  it("responde 500 genérico ante un error inesperado", async () => {
    loginWithGoogle.mockRejectedValue(new Error("fallo interno con datos sensibles"));

    const res = await request(app)
      .post("/api/auth/google")
      .send({ idToken: "token-valido" });

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("datos sensibles");
  });
});
