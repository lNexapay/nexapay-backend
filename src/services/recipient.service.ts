import pool from "../config/database";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ACCOUNT_NUMBER = /^[0-9]{8}$/;

// Devuelve el id de la billetera del destinatario, o null si no existe.
// El destinatario se identifica por correo o por número de cuenta de 8 dígitos.
// La billetera tiene su propio id (tabla wallets), distinto del id del usuario.
export const findWalletIdByRecipient = async (
  recipient: string
): Promise<string | null> => {
  let column: string;

  if (EMAIL.test(recipient)) {
    column = "LOWER(u.email) = LOWER($1)";
  } else if (ACCOUNT_NUMBER.test(recipient)) {
    column = "u.account_number = $1";
  } else {
    return null;
  }

  const result = await pool.query(
    `SELECT w.id
     FROM users u
     JOIN wallets w ON w.user_id = u.id
     WHERE ${column}`,
    [recipient]
  );

  return result.rows[0]?.id ?? null;
};
