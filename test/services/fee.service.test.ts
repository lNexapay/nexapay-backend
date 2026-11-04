import { describe, it, expect } from "vitest";
import { feeService } from "../../src/services/fee.service";
import { TRANSFER_FEE_PERCENT } from "../../src/config/fees";

describe("feeService", () => {
  it("cobra el porcentaje del par sobre el monto de origen", () => {
    expect(feeService.conversionFee(100, "USD", "COP")).toBe(0.9);
    expect(feeService.conversionFee(100, "USD", "EUR")).toBe(0.4);
    expect(feeService.conversionFee(1000, "ARS", "COP")).toBe(12);
  });

  it("la comisión es la misma en ambos sentidos", () => {
    expect(feeService.getConversionFeePercent("COP", "ARS")).toBe(
      feeService.getConversionFeePercent("ARS", "COP")
    );
    expect(feeService.conversionFee(1000000, "COP", "USD")).toBe(9000);
  });

  it("redondea la comisión a dos decimales", () => {
    expect(feeService.conversionFee(33.33, "USD", "ARS")).toBe(0.27);
  });

  it("rechaza un par de monedas sin comisión definida", () => {
    expect(() => feeService.getConversionFeePercent("USD", "XYZ")).toThrow(
      "No hay comisión definida para ese par de monedas"
    );
  });

  it("la comisión de transferencia sigue la configuración", () => {
    expect(feeService.transferFee(100)).toBe(
      Math.round((100 * TRANSFER_FEE_PERCENT) / 100 * 100) / 100
    );
  });

  it("devuelve la tabla de comisiones en ambos sentidos", () => {
    const table = feeService.getFeeTable();

    expect(table.conversion).toHaveLength(12);
    expect(table.conversion).toContainEqual({ from: "USD", to: "COP", percent: 0.9 });
    expect(table.conversion).toContainEqual({ from: "COP", to: "USD", percent: 0.9 });
    expect(table.transfer.percent).toBe(TRANSFER_FEE_PERCENT);
  });
});
