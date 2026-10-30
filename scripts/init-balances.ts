
/**
 * Inicializa los balances faltantes de las billeteras existentes.
 *
 * - Crea ARS, USD, EUR y COP con saldo cero.
 * - No modifica los balances que ya existen.
 * - Puede ejecutarse más de una vez sin duplicar registros.
 */

import "dotenv/config";
import pool from "../src/config/database";

const initBalances = async () => {
    try {
        // Crear únicamente los balances que todavía no existen.
        const result = await pool.query(
            `INSERT INTO balances (wallet_id, currency_code, amount)
       SELECT
         w.id,
         c.currency_code,
         0
       FROM wallets AS w
       CROSS JOIN (
         VALUES ('ARS'), ('USD'), ('EUR'), ('COP')
       ) AS c(currency_code)
       ON CONFLICT (wallet_id, currency_code)
       DO NOTHING`
        );

        console.log("Balances inicializados correctamente.");
        console.log(`Registros creados: ${result.rowCount}`);

        // Comprobar cuántas billeteras y balances existen.
        const verification = await pool.query(
            `SELECT
         COUNT(DISTINCT w.id)::int AS wallets,
         COUNT(b.id)::int AS balances
       FROM wallets w
       LEFT JOIN balances b ON b.wallet_id = w.id`
        );

        console.log("Estado actual:", verification.rows[0]);

    } catch (error) {
        console.error("Error al inicializar balances:", error);
        process.exitCode = 1;

    } finally {
        // Cerrar las conexiones al terminar.
        await pool.end();
    }
};

initBalances();
