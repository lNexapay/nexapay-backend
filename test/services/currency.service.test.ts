import { describe, it, expect } from "vitest";
import { currencyService } from "../../src/services/currency.service";
import { RATES_PER_USD } from "../../src/config/currencies";

const round2 = (v: number): number => Math.round(v * 100) / 100;

describe("currencyService", () => {
  it("devuelve las 4 monedas", () => {
    expect(currencyService.getCurrencies()).toHaveLength(4);
  });

  it("reconoce monedas soportadas y rechaza las desconocidas", () => {
    expect(currencyService.isSupported("COP")).toBe(true);
    expect(currencyService.isSupported("XYZ")).toBe(false);
  });

  it("la tasa de USD a COP es la configurada", () => {
    expect(currencyService.getRate("USD", "COP")).toBe(RATES_PER_USD.COP);
  });

  it("la tasa de una moneda consigo misma es 1", () => {
    expect(currencyService.getRate("EUR", "EUR")).toBe(1);
  });

  it("convierte 100 USD a COP", () => {
    const result = currencyService.convert(100, "USD", "COP");
    expect(result.result).toBe(round2(100 * RATES_PER_USD.COP));
  });

  it("convierte con la tasa exacta aunque sea muy pequeña (COP a USD)", () => {
    const result = currencyService.convert(900000, "COP", "USD");
    expect(result.result).toBe(round2(900000 / RATES_PER_USD.COP));
  });

  it("rechaza montos cero o negativos", () => {
    expect(() => currencyService.convert(0, "USD", "COP")).toThrow(
      "El monto debe ser mayor a cero"
    );
    expect(() => currencyService.convert(-5, "USD", "COP")).toThrow(
      "El monto debe ser mayor a cero"
    );
  });

  it("rechaza una moneda no soportada", () => {
    expect(() => currencyService.getRate("USD", "XYZ")).toThrow(
      "Moneda no soportada"
    );
    expect(() => currencyService.convert(10, "USD", "XYZ")).toThrow(
      "Moneda no soportada"
    );
  });

  it("devuelve la base, las tasas y la fecha de actualización", () => {
    const info = currencyService.getRatesInfo();
    expect(info.base).toBe("USD");
    expect(info.rates).toEqual(RATES_PER_USD);
    expect(info.updatedAt).toBeInstanceOf(Date);
  });
});