import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes";

const app = express();

/**
 * Permite que el frontend de NEXAPAY
 * envíe cookies de sesión al backend.
 */
app.use(cors({
    origin: "http://localhost:5173",
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
