import { CONVERSION_FEE_PERCENT, TRANSFER_FEE_PERCENT } from "../config/fees";
import { CurrencyCode } from "../types/wallet.types";
import { AppError } from "../utils/appError";

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const pairKey = (a: CurrencyCode, b: CurrencyCode): string =>
  [a, b].sort().join("-");

export const feeService = {
  // Porcentaje de comisión de una conversión entre dos monedas.
  getConversionFeePercent(from: CurrencyCode, to: CurrencyCode): number {
    const percent = CONVERSION_FEE_PERCENT[pairKey(from, to)];
    if (percent === undefined) {
      throw new AppError("No hay comisión definida para ese par de monedas", 400);
    }
    return percent;
  },

  // Comisión de una conversión, en la moneda de origen.
  conversionFee(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    return round2((amount * this.getConversionFeePercent(from, to)) / 100);
  },

  // Comisión de una transferencia, en la moneda transferida.
  transferFee(amount: number): number {
    return round2((amount * TRANSFER_FEE_PERCENT) / 100);
  },
};