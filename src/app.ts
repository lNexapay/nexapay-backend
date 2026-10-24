import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes";

const app = express();

app.use(cors({
    origin: "http://localhost:5173"
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
