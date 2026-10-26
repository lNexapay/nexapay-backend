import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryWalletRepository } from "../../src/data/wallet.store";
import { createBalanceService } from "../../src/services/balance.service";

describe("balanceService", () => {
  let repo: InMemoryWalletRepository;
  let service: ReturnType<typeof createBalanceService>;

  beforeEach(() => {
    repo = new InMemoryWalletRepository();
    service = createBalanceService(repo);
  });

  it("devuelve un saldo por cada moneda", async () => {
    const balances = await service.getBalances();
    expect(balances).toHaveLength(4);
  });

  it("devuelve el saldo de una moneda", async () => {
    const usd = await service.getBalance("USD");
    expect(usd.amount).toBe(520);
  });

  it("rechaza una moneda no soportada", async () => {
    await expect(service.getBalance("XYZ")).rejects.toThrow("Moneda no soportada");
  });

  it("calcula el balance total en USD", async () => {
    const total = await service.getTotalBalance();
    expect(total.baseCurrency).toBe("USD");
    expect(total.total).toBeCloseTo(1092.51, 1);
  });
});