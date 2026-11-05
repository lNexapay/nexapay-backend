import { AI_CONFIG, AI_SYSTEM_PROMPT } from "../config/ai";
import { RATES_PER_USD } from "../config/currencies";
import { CONVERSION_FEE_PERCENT, TRANSFER_FEE_PERCENT } from "../config/fees";
import { AppError } from "../utils/appError";
import { balanceService } from "./balance.service";
import { transactionService } from "./transaction.service";
import { AiProvider, ChatMessage, geminiProvider } from "./ai.provider";

const TIPOS: Record<string, string> = {
  deposit: "ingreso",
  convert: "conversión",
  transfer_out: "transferencia enviada",
  transfer_in: "transferencia recibida",
};

// Una sola línea y corta: la descripción la escribe el usuario.
const oneLine = (text: string | undefined, max = 60): string =>
  (text ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Datos del usuario que se le pasan al modelo.
 * Solo montos, monedas y movimientos: nada de correos ni identificadores.
 */
export const buildUserContext = async (walletId: string): Promise<string> => {
  const total = await balanceService.getTotalBalance(walletId);
  const history = await transactionService.getHistory(walletId, 5);

  const saldos = total.breakdown
    .map((b) => `- ${b.currencyCode}: ${b.amount}`)
    .join("\n");

  const movimientos = history.length
    ? history
        .map((tx) => {
          const fecha = new Date(tx.createdAt).toISOString().slice(0, 10);
          const tipo = TIPOS[tx.type] ?? tx.type;
          const monto =
            tx.type === "convert"
              ? `${tx.amountFrom} ${tx.currencyFrom} → ${tx.amountTo} ${tx.currencyTo}`
              : `${tx.amountFrom} ${tx.currencyFrom}`;
          const comision =
            tx.feeAmount && tx.feeAmount > 0
              ? ` | comisión ${tx.feeAmount} ${tx.feeCurrency}`
              : "";
          const nota = oneLine(tx.description);
          return `- ${fecha} | ${tipo} | ${monto}${comision}${nota ? ` | nota: ${nota}` : ""}`;
        })
        .join("\n")
    : "- Sin movimientos todavía";

  const tasas = Object.entries(RATES_PER_USD)
    .map(([moneda, tasa]) => `${moneda}: ${tasa}`)
    .join(", ");

  const comisiones = Object.entries(CONVERSION_FEE_PERCENT)
    .map(([par, porcentaje]) => `${par.replace("-", " ↔ ")}: ${porcentaje} %`)
    .join(", ");

  return [
    "Saldos por moneda:",
    saldos,
    `Balance total estimado: ${total.total} ${total.baseCurrency}`,
    "Últimos movimientos (del más reciente al más antiguo):",
    movimientos,
    `Tasas (unidades de cada moneda por 1 USD): ${tasas}`,
    `Comisiones de conversión: ${comisiones}. Transferencias: ${TRANSFER_FEE_PERCENT} %.`,
  ].join("\n");
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new AppError(
            "El asistente tardó demasiado en responder. Inténtalo de nuevo.",
            503
          )
        ),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

// El historial lo manda el cliente: no es de fiar. Se valida, se recorta y se ordena.
const cleanHistory = (history: unknown): ChatMessage[] => {
  if (history === undefined || history === null) return [];
  if (!Array.isArray(history)) {
    throw new AppError("El historial debe ser una lista", 400);
  }

  return history
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, AI_CONFIG.maxMessageLength),
    }))
    .slice(-AI_CONFIG.maxHistoryMessages);
};

// Une turnos seguidos del mismo rol y exige que la conversación empiece con el usuario.
const normalize = (messages: ChatMessage[]): ChatMessage[] => {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n${m.content}`;
    } else {
      out.push({ ...m });
    }
  }
  while (out.length > 0 && out[0].role !== "user") out.shift();
  return out;
};

export const createAiService = (
  provider: AiProvider,
  loadContext: (walletId: string) => Promise<string>,
  options: { timeoutMs?: number } = {}
) => ({
  async chat(
    message: unknown,
    history: unknown,
    walletId: string
  ): Promise<string> {
    if (typeof message !== "string" || !message.trim()) {
      throw new AppError("El mensaje es obligatorio", 400);
    }
    if (message.length > AI_CONFIG.maxMessageLength) {
      throw new AppError(
        `El mensaje no puede superar ${AI_CONFIG.maxMessageLength} caracteres`,
        400
      );
    }

    const messages = normalize([
      ...cleanHistory(history),
      { role: "user", content: message.trim() },
    ]);

    const context = await loadContext(walletId);
    const system = `${AI_SYSTEM_PROMPT}\n\n<datos_del_usuario>\n${context}\n</datos_del_usuario>`;

    try {
      const reply = await withTimeout(
        provider.ask({ system, messages }),
        options.timeoutMs ?? AI_CONFIG.timeoutMs
      );

      if (!reply.trim()) {
        throw new AppError(
          "El asistente no pudo responder. Inténtalo de nuevo.",
          503
        );
      }
      return reply.trim();
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      // No se registra el contenido de la conversación, solo el tipo de fallo.
      console.error("[ai] fallo del proveedor:", error?.status ?? error?.name);
      throw new AppError("El asistente no está disponible en este momento", 503);
    }
  },
});

export const aiService = createAiService(geminiProvider, buildUserContext);