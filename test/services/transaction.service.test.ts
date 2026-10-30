import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_WALLET_ID,
  InMemoryWalletRepository,
} from "../../src/data/wallet.store";
import { RATES_PER_USD } from "../../src/config/currencies";
import { createBalanceService } from "../../src/services/balance.service";
import {
  createTransactionService,
  MAX_AMOUNT,
} from "../../src/services/transaction.service";

const round2 = (v: number): number => Math.round(v * 100) / 100;

// Destinatario de ejemplo para las transferencias: "juan.nexa" (con o sin @).
const OTRA_WALLET = "wallet-otro";
const resolver = async (alias: string) =>
  alias.replace("@", "") === "juan.nexa" ? OTRA_WALLET : null;

describe("transactionService", () => {
  let repo: InMemoryWalletRepository;
  let service: ReturnType<typeof createTransactionService>;
  let balances: ReturnType<typeof createBalanceService>;

  beforeEach(() => {
    repo = new InMemoryWalletRepository();
    service = createTransactionService(repo);
    balances = createBalanceService(repo);
  });

  it("un ingreso suma al saldo", async () => {
    await service.deposit("USD", 50);
    expect((await balances.getBalance("USD")).amount).toBe(570);
  });

  it("rechaza un monto mayor al máximo permitido", async () => {
    await expect(service.deposit("USD", MAX_AMOUNT + 1)).rejects.toThrow(
      "El monto excede el máximo permitido"
    );
  });

  it("rechaza montos inválidos", async () => {
    await expect(service.deposit("USD", -5)).rejects.toThrow(
      "El monto debe ser un número mayor a cero"
    );
    await expect(service.deposit("USD", "50")).rejects.toThrow(
      "El monto debe ser un número mayor a cero"
    );
  });

  it("convierte USD a COP y actualiza ambos saldos", async () => {
    const expectedCop = round2(100 * RATES_PER_USD.COP);

    const tx = await service.convert("USD", "COP", 100);

    expect(tx.amountTo).toBe(expectedCop);
    expect((await balances.getBalance("USD")).amount).toBe(420);
    expect((await balances.getBalance("COP")).amount).toBeCloseTo(
      900000 + expectedCop,
      2
    );
  });

  it("rechaza una conversión sin saldo suficiente", async () => {
    await expect(service.convert("USD", "COP", 999999)).rejects.toThrow(
      "Saldo insuficiente"
    );
  });

  it("rechaza convertir a la misma moneda", async () => {
    await expect(service.convert("USD", "USD", 10)).rejects.toThrow(
      "Las monedas deben ser distintas"
    );
  });

  it("rechaza una moneda no soportada al convertir", async () => {
    await expect(service.convert("USD", "XYZ", 10)).rejects.toThrow(
      "Moneda no soportada"
    );
  });

  it("guarda las operaciones en el historial", async () => {
    await service.deposit("USD", 50);
    await service.convert("USD", "EUR", 10);

    const history = await service.getHistory();

    expect(history).toHaveLength(2);
    expect(history[0].type).toBe("convert");
  });

  describe("transferencias", () => {
    let transfers: ReturnType<typeof createTransactionService>;

    beforeEach(() => {
      transfers = createTransactionService(repo, resolver);
    });

    it("mueve el dinero entre wallets", async () => {
      await transfers.transfer("@juan.nexa", "USD", 50);

      // Cada wallet nueva arranca con 520 USD de ejemplo (ver wallet.store.ts).
      expect((await repo.getBalance(DEFAULT_WALLET_ID, "USD"))?.amount).toBe(470);
      expect((await repo.getBalance(OTRA_WALLET, "USD"))?.amount).toBe(570);
    });

    it("cada wallet ve su propio movimiento y acepta el alias sin arroba", async () => {
      await transfers.transfer("juan.nexa", "USD", 50);

      const enviada = await transfers.getHistory(20, DEFAULT_WALLET_ID);
      const recibida = await transfers.getHistory(20, OTRA_WALLET);

      expect(enviada[0].type).toBe("transfer_out");
      expect(recibida[0].type).toBe("transfer_in");
    });

    it("rechaza un destinatario inexistente", async () => {
      await expect(transfers.transfer("@nadie", "USD", 10)).rejects.toThrow(
        "Destinatario no encontrado"
      );
    });

    it("rechaza transferirse a uno mismo", async () => {
      const yo = createTransactionService(repo, async () => DEFAULT_WALLET_ID);

      await expect(yo.transfer("@yo", "USD", 10)).rejects.toThrow(
        "No puedes transferirte a ti mismo"
      );
    });

    it("rechaza una transferencia sin saldo suficiente", async () => {
      await expect(
        transfers.transfer("@juan.nexa", "USD", 999999)
      ).rejects.toThrow("Saldo insuficiente");
    });

    it("rechaza una moneda no soportada", async () => {
      await expect(transfers.transfer("@juan.nexa", "XYZ", 10)).rejects.toThrow(
        "Moneda no soportada"
      );
    });

    it("rechaza un alias vacío", async () => {
      await expect(transfers.transfer("   ", "USD", 10)).rejects.toThrow(
        "El alias del destinatario es obligatorio"
      );
    });
  });

  describe("withTransaction", () => {
    it("revierte los cambios si algo falla", async () => {
      await expect(
        repo.withTransaction(async (r) => {
          await r.setBalance(DEFAULT_WALLET_ID, "USD", 1);
          throw new Error("fallo");
        })
      ).rejects.toThrow("fallo");

      expect((await repo.getBalance(DEFAULT_WALLET_ID, "USD"))?.amount).toBe(520);
    });
  });
});