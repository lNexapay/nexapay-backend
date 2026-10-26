import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { MAX_AMOUNT } from "../../src/services/transaction.service";

vi.mock("../../src/auth/auth.middleware", () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    res.locals.userId = req.header("x-user-id") ?? "usuario-prueba";
    next();
  },
}));

const como = (usuario: string) => ({ "x-user-id": usuario });

describe("wallet por usuario", () => {
  it("cada usuario arranca con sus propios saldos de ejemplo", async () => {
    const res = await request(app).get("/api/balances").set(como("ana"));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body.every((b: any) => b.walletId === "ana")).toBe(true);
  });

  it("el depósito de un usuario no afecta a otro", async () => {
    await request(app).post("/api/deposit").set(como("beto")).send({ currency: "USD", amount: 500 });

    const beto = await request(app).get("/api/balances/USD").set(como("beto"));
    const carla = await request(app).get("/api/balances/USD").set(como("carla"));

    expect(beto.body.amount).toBe(1020);
    expect(carla.body.amount).toBe(520);
  });

  it("cada usuario tiene su propio historial", async () => {
    await request(app).post("/api/convert").set(como("dani"))
      .send({ from: "USD", to: "EUR", amount: 10 });

    const dani = await request(app).get("/api/transactions").set(como("dani"));
    const eva = await request(app).get("/api/transactions").set(como("eva"));

    expect(dani.body).toHaveLength(1);
    expect(dani.body[0].walletId).toBe("dani");
    expect(eva.body).toHaveLength(0);
  });

  it("convertir con saldo de otro usuario no es posible", async () => {
    await request(app).post("/api/deposit").set(como("fede")).send({ currency: "USD", amount: 100000 });

    const gina = await request(app).post("/api/convert").set(como("gina"))
      .send({ from: "USD", to: "EUR", amount: 50000 });

    expect(gina.status).toBe(400);
    expect(gina.body.error).toBe("Saldo insuficiente");
  });
});

describe("wallet: validaciones de entrada", () => {
  it("JSON mal formado responde 400 y no 500", async () => {
    const res = await request(app).post("/api/deposit")
      .set(como("hugo")).set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("JSON mal formado");
  });

  it("un monto mayor al máximo se rechaza", async () => {
    const res = await request(app).post("/api/deposit")
      .set(como("ines")).send({ currency: "USD", amount: MAX_AMOUNT + 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("El monto excede el máximo permitido");
  });

  it("un monto de 1e308 se rechaza", async () => {
    const res = await request(app).post("/api/deposit")
      .set(como("ines")).send({ currency: "USD", amount: 1e308 });
    expect(res.status).toBe(400);
  });

  it("el monto máximo exacto sí se acepta", async () => {
    const res = await request(app).post("/api/deposit")
      .set(como("juan")).send({ currency: "USD", amount: MAX_AMOUNT });
    expect(res.status).toBe(201);
  });

  it("un cuerpo vacío responde 400", async () => {
    const res = await request(app).post("/api/convert").set(como("kira")).send({});
    expect(res.status).toBe(400);
  });
});
