import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken;
  },
}));
vi.mock("../../src/config/database", () => ({ default: { connect: vi.fn() } }));
vi.mock("../../src/auth/refresh-token.service", () => ({
  createRefreshSession: vi.fn(),
}));

import {
  verifyGoogleToken,
  GoogleAuthError,
} from "../../src/auth/google-auth.service";

const ticketWith = (payload: Record<string, unknown> | undefined) => ({
  getPayload: () => payload,
});

describe("verifyGoogleToken", () => {
  const original = process.env.GOOGLE_CLIENT_ID;

  beforeEach(() => {
    verifyIdToken.mockReset();
    process.env.GOOGLE_CLIENT_ID = "client-id-de-prueba";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = original;
  });

  it("falla con error de configuración si falta GOOGLE_CLIENT_ID", async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    await expect(verifyGoogleToken("token")).rejects.toThrow(
      "GOOGLE_CLIENT_ID no está configurado"
    );
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("rechaza un token vacío sin consultar a Google", async () => {
    await expect(verifyGoogleToken("   ")).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("verifica el token contra el client id configurado", async () => {
    verifyIdToken.mockResolvedValue(
      ticketWith({ sub: "g-1", email: "ana@test.com", email_verified: true, name: "Ana" })
    );

    await verifyGoogleToken("token-ok");

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "token-ok",
      audience: "client-id-de-prueba",
    });
  });

  it("devuelve la identidad con el correo normalizado", async () => {
    verifyIdToken.mockResolvedValue(
      ticketWith({
        sub: "g-1",
        email: "  Ana@Test.COM ",
        email_verified: true,
        name: " Ana Pérez ",
      })
    );

    await expect(verifyGoogleToken("token-ok")).resolves.toEqual({
      googleId: "g-1",
      email: "ana@test.com",
      name: "Ana Pérez",
    });
  });

  it("usa la parte local del correo si Google no envía nombre", async () => {
    verifyIdToken.mockResolvedValue(
      ticketWith({ sub: "g-1", email: "ana@test.com", email_verified: true })
    );

    const identity = await verifyGoogleToken("token-ok");
    expect(identity.name).toBe("ana");
  });

  it("responde 401 si Google rechaza el token (firma, audiencia o expiración)", async () => {
    verifyIdToken.mockRejectedValue(new Error("Wrong recipient"));

    const error = await verifyGoogleToken("token-malo").catch((e) => e);

    expect(error).toBeInstanceOf(GoogleAuthError);
    expect(error.statusCode).toBe(401);
  });

  it("rechaza identidades con correo no verificado", async () => {
    verifyIdToken.mockResolvedValue(
      ticketWith({ sub: "g-1", email: "ana@test.com", email_verified: false })
    );

    await expect(verifyGoogleToken("token")).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("rechaza payloads sin sub o sin correo", async () => {
    verifyIdToken.mockResolvedValue(
      ticketWith({ email: "ana@test.com", email_verified: true })
    );
    await expect(verifyGoogleToken("t1")).rejects.toMatchObject({ statusCode: 401 });

    verifyIdToken.mockResolvedValue(ticketWith({ sub: "g-1", email_verified: true }));
    await expect(verifyGoogleToken("t2")).rejects.toMatchObject({ statusCode: 401 });

    verifyIdToken.mockResolvedValue(ticketWith(undefined));
    await expect(verifyGoogleToken("t3")).rejects.toMatchObject({ statusCode: 401 });
  });
});
