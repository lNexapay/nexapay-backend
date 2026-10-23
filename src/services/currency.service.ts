import { SUPPORTED_CURRENCIES, RATES_PER_USD } from "../config/currencies";
import { Currency, CurrencyCode } from "../types/wallet.types";

const round2 = (v: number): number => Math.round(v * 100) / 100;
const round6 = (v: number): number => Math.round(v * 1e6) / 1e6;

export const currencyService = {
  getCurrencies(): Currency[] {
    return SUPPORTED_CURRENCIES;
  },

  isSupported(code: string): code is CurrencyCode {
    return SUPPORTED_CURRENCIES.some((c) => c.code === code);
  },

  // Cuántas unidades de "to" equivalen a 1 unidad de "from".
  getRate(from: CurrencyCode, to: CurrencyCode): number {
    if (!this.isSupported(from) || !this.isSupported(to)) {
      throw new Error("Moneda no soportada");
    }
    return round6(RATES_PER_USD[to] / RATES_PER_USD[from]);
  },

  convert(amount: number, from: CurrencyCode, to: CurrencyCode) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("El monto debe ser mayor a cero");
    }
    const rate = this.getRate(from, to);
    return { from, to, amount, rate, result: round2(amount * rate) };
  },
};