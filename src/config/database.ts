/**
 * Configuración de la conexión a PostgreSQL.
 * Centraliza el pool de conexiones que utilizará
 * el backend para realizar consultas a la base de datos.
 */

import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export default pool;
