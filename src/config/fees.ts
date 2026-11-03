// Comisión por conversión, en porcentaje sobre el monto de origen.
// Es la misma en ambos sentidos. Las claves van en orden alfabético.
// Valores de ejemplo propuestos por el equipo: ajustar cuando se definan los reales.
export const CONVERSION_FEE_PERCENT: Record<string, number> = {
  "EUR-USD": 0.4,
  "ARS-USD": 0.8,
  "COP-USD": 0.9,
  "ARS-EUR": 0.9,
  "COP-EUR": 1.0,
  "ARS-COP": 1.2,
};

// Comisión de las transferencias (misma moneda). 0 = sin comisión hasta que el equipo lo decida.
export const TRANSFER_FEE_PERCENT = 0;