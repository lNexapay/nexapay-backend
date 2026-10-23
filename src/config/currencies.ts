import { Currency } from "../types/wallet.types";

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: "ARS", name: "Peso argentino", symbol: "$" },
  { code: "USD", name: "Dólar estadounidense", symbol: "$" },
  { code: "COP", name: "Peso colombiano", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
];

// Cuántas unidades de cada moneda equivalen a 1 USD.
// Valores de ejemplo para desarrollo: el equipo debe definir los reales.
export const RATES_PER_USD: Record<string, number> = {
  ARS: 1000,
  USD: 1,
  COP: 4000,
  EUR: 0.92,
};