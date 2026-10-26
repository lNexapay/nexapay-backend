import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryWalletRepository } from "../../src/data/wallet.store";
import { createTransactionService } from "../../src/services/transaction.service";
import { createBalanceService } from "../../src/services/balance.service";

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

  it("convierte USD a COP y actualiza ambos saldos", async () => {
    const tx = await service.convert("USD", "COP", 100);
    expect(tx.amountTo).toBe(316187);
    expect((await balances.getBalance("USD")).amount).toBe(420);
    expect((await balances.getBalance("COP")).amount).toBe(1216187);
  });

  it("rechaza una conversión sin saldo suficiente", async () => {
    await expect(service.convert("USD", "COP", 999999)).rejects.toThrow("Saldo insuficiente");
  });

  it("rechaza convertir a la misma moneda", async () => {
    await expect(service.convert("USD", "USD", 10)).rejects.toThrow("Las monedas deben ser distintas");
  });

  it("rechaza montos inválidos", async () => {
    await expect(service.deposit("USD", -5)).rejects.toThrow("El monto debe ser un número mayor a cero");
  });

  it("guarda las operaciones en el historial", async () => {
    await service.deposit("USD", 50);
    await service.convert("USD", "EUR", 10);
    const history = await service.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].type).toBe("convert");
  });
});