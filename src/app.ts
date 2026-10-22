import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        message: "NEXAPAY API funcionando correctamente"
    });
});

export default app;
