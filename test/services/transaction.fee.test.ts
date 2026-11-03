import { vi } from "vitest";

vi.mock("../../src/config/fees", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/config/fees")>();
  return { ...original, TRANSFER_FEE_PERCENT: 1 };
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_WALLET_ID,
  InMemoryWalletRepository,
} from "../../src/data/wallet.store";
import { createTransactionService } from "../../src/services/transaction.service";

const OTRA_WALLET = "wallet-otro";
const resolver = async (r: string) => (r === "juan@nexa.io" ? OTRA_WALLET : null);

describe("comisión de transferencias (1 %)", () => {
  let repo: InMemoryWalletRepository;
  let service: ReturnType<typeof createTransactionService>;

  beforeEach(() => {
    repo = new InMemoryWalletRepository();
    service = createTransactionService(repo, resolver);
  });

  it("el emisor paga la comisión además del monto", async () => {
    const antesEmisor = (await repo.getBalance(DEFAULT_WALLET_ID, "USD"))!.amount;
    const antesDestino = (await repo.getBalance(OTRA_WALLET, "USD"))?.amount ?? 0;

    const tx = await service.transfer("juan@nexa.io", "USD", 100);

    expect(tx.feeAmount).toBe(1);
    expect(tx.feeCurrency).toBe("USD");
    expect((await repo.getBalance(DEFAULT_WALLET_ID, "USD"))?.amount).toBe(antesEmisor - 101);
    expect((await repo.getBalance(OTRA_WALLET, "USD"))?.amount).toBe(antesDestino + 100);
  });

  it("rechaza si el saldo no alcanza para monto más comisión", async () => {
    // Con 520 USD de saldo inicial: 515 + 1 % = 520,15.
    await expect(service.transfer("juan@nexa.io", "USD", 515)).rejects.toThrow(
      "Saldo insuficiente"
    );
  });
});