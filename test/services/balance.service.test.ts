
import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryWalletRepository } from "../../src/data/wallet.store";
import { createBalanceService } from "../../src/services/balance.service";
import { ReservedBalance } from "../../src/types/wallet.types";

describe("balanceService", () => {
  let repo: InMemoryWalletRepository;
  let service: ReturnType<typeof createBalanceService>;

  beforeEach(() => {
    repo = new InMemoryWalletRepository();
    service = createBalanceService(repo);
  });

  // Simula una lectura consistente con los saldos
  // disponibles actuales y los importes reservados indicados.
  function simularReservados(reservedBalances: ReservedBalance[]) {
    return vi.spyOn(repo, "getBalanceSnapshot").mockImplementation(
      async (walletId: string) => ({
        balances: await repo.getBalances(walletId),
        reservedBalances: reservedBalances.map((reserved) => ({
          ...reserved,
        })),
      })
    );
  }

  it("devuelve un saldo por cada moneda", async () => {
    const balances = await service.getBalances();
    expect(balances).toHaveLength(4);
  });

  it("devuelve el saldo de una moneda", async () => {
    const usd = await service.getBalance("USD");
    expect(usd.amount).toBe(520);
  });

  it("rechaza una moneda no soportada", async () => {
    await expect(service.getBalance("XYZ")).rejects.toThrow(
      "Moneda no soportada"
    );
  });

  it("calcula el balance total en USD", async () => {
    const total = await service.getTotalBalance();

    expect(total.baseCurrency).toBe("USD");
    expect(total.total).toBeCloseTo(1092.51, 1);
  });

  it("sin espacios, el saldo reservado es cero", async () => {
    const result = await service.getTotalBalance("wallet-demo", "ARS");

    for (const balance of result.breakdown) {
      expect(balance.reservedAmount).toBe(0);
      expect(balance.amount).toBe(balance.availableAmount);
    }
  });

  it("suma el dinero reservado al patrimonio total", async () => {
    await repo.setBalance("wallet-demo", "ARS", 70000);

    simularReservados([
      { currencyCode: "ARS", amount: 30000 },
    ]);

    const result = await service.getTotalBalance("wallet-demo", "ARS");
    const ars = result.breakdown.find(
      (balance) => balance.currencyCode === "ARS"
    );

    expect(ars).toBeDefined();
    expect(ars?.availableAmount).toBe(70000);
    expect(ars?.reservedAmount).toBe(30000);
    expect(ars?.amount).toBe(100000);
    expect(ars?.convertedAmount).toBe(100000);
  });

  it("suma correctamente varios importes reservados de una misma moneda", async () => {
    await repo.setBalance("wallet-demo", "ARS", 50000);

    simularReservados([
      { currencyCode: "ARS", amount: 20000 },
      { currencyCode: "ARS", amount: 30000 },
    ]);

    const result = await service.getTotalBalance("wallet-demo", "ARS");
    const ars = result.breakdown.find(
      (balance) => balance.currencyCode === "ARS"
    );

    expect(ars?.availableAmount).toBe(50000);
    expect(ars?.reservedAmount).toBe(50000);
    expect(ars?.amount).toBe(100000);
  });

  it("incluye espacios de ahorro en diferentes monedas", async () => {
    await repo.setBalance("wallet-demo", "ARS", 70000);
    await repo.setBalance("wallet-demo", "USD", 400);

    simularReservados([
      { currencyCode: "ARS", amount: 30000 },
      { currencyCode: "USD", amount: 100 },
    ]);

    const result = await service.getTotalBalance("wallet-demo", "USD");

    const ars = result.breakdown.find(
      (balance) => balance.currencyCode === "ARS"
    );

    const usd = result.breakdown.find(
      (balance) => balance.currencyCode === "USD"
    );

    expect(ars?.amount).toBe(100000);
    expect(ars?.reservedAmount).toBe(30000);

    expect(usd?.availableAmount).toBe(400);
    expect(usd?.reservedAmount).toBe(100);
    expect(usd?.amount).toBe(500);
    expect(usd?.convertedAmount).toBe(500);

    const sum = result.breakdown.reduce(
      (acc, balance) => acc + balance.convertedAmount,
      0
    );

    expect(result.total).toBeCloseTo(sum, 2);
  });

  it("conserva el patrimonio al trasladar dinero a un espacio", async () => {
    await repo.setBalance("wallet-demo", "ARS", 100000);

    const snapshotSpy = simularReservados([]);

    const before = await service.getTotalBalance("wallet-demo", "ARS");

    // Simulamos el estado posterior a un aporte de 30.000 ARS.
    await repo.setBalance("wallet-demo", "ARS", 70000);

    snapshotSpy.mockImplementation(async (walletId: string) => ({
      balances: await repo.getBalances(walletId),
      reservedBalances: [
        { currencyCode: "ARS", amount: 30000 },
      ],
    }));

    const after = await service.getTotalBalance("wallet-demo", "ARS");

    expect(after.total).toBe(before.total);

    const ars = after.breakdown.find(
      (balance) => balance.currencyCode === "ARS"
    );

    expect(ars?.availableAmount).toBe(70000);
    expect(ars?.reservedAmount).toBe(30000);
    expect(ars?.amount).toBe(100000);
  });

  it("utiliza el snapshot y no realiza dos lecturas independientes", async () => {
    const snapshotSpy = vi.spyOn(repo, "getBalanceSnapshot");
    const balancesSpy = vi.spyOn(repo, "getBalances");
    const reservedSpy = vi.spyOn(repo, "getReservedBalances");

    await service.getTotalBalance("wallet-demo", "ARS");

    expect(snapshotSpy).toHaveBeenCalledExactlyOnceWith("wallet-demo");
    expect(balancesSpy).not.toHaveBeenCalled();
    expect(reservedSpy).not.toHaveBeenCalled();
  });
});
