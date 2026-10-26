import { SUPPORTED_CURRENCIES, RATES_PER_USD, RATES_UPDATED_AT } from "../config/currencies";
import { Currency, CurrencyCode } from "../types/wallet.types";
import { AppError } from "../utils/appError";


const round2 = (v: number): number => Math.round(v * 100) / 100;
const round6 = (v: number): number => Math.round(v * 1e6) / 1e6;

export const currencyService = {
  getCurrencies(): Currency[] {
    return SUPPORTED_CURRENCIES;
  },
  getRatesInfo() {
    return {
      base: "USD",
      updatedAt: RATES_UPDATED_AT,
      rates: RATES_PER_USD,
    };
  },

  isSupported(code: string): code is CurrencyCode {
    return SUPPORTED_CURRENCIES.some((c) => c.code === code);
  },

  // Cuántas unidades de "to" equivalen a 1 unidad de "from".
  getRate(from: CurrencyCode, to: CurrencyCode): number {
    if (!this.isSupported(from) || !this.isSupported(to)) {
      throw new AppError("Moneda no soportada", 400);
    }
    return round6(RATES_PER_USD[to] / RATES_PER_USD[from]);
  },

    convert(amount: number, from: CurrencyCode, to: CurrencyCode) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError("El monto debe ser mayor a cero", 400);
    }
    if (!this.isSupported(from) || !this.isSupported(to)) {
      throw new AppError("Moneda no soportada", 400);
    }
    const exactRate = RATES_PER_USD[to] / RATES_PER_USD[from];
    return {
      from,
      to,
      amount,
      rate: round6(exactRate),       // solo para mostrar
      result: round2(amount * exactRate),
    };
  },
};