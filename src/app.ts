import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes";

const app = express();

/**
 * Permite solicitudes desde React en desarrollo
 * y desde el frontend desplegado en Vercel.
 */
app.use(cors({
    origin: [
        "http://localhost:5173",
        process.env.FRONTEND_URL || "http://localhost:5173"
    ],
    credentials: true
}));

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        message: "NEXAPAY API funcionando correctamente"
    });
});

export default app;
