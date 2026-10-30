import pool from "../config/database";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Devuelve el id de wallet del destinatario, o null si no existe.
// Hoy solo se resuelve por correo: la tabla users aún no tiene alias.
// Mientras la wallet viva en memoria, el id del usuario hace de id de wallet.
export const findWalletIdByRecipient = async (
  recipient: string
): Promise<string | null> => {
  if (!EMAIL.test(recipient)) return null;

  const result = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
    [recipient]
  );
  return result.rows[0]?.id ?? null;
};