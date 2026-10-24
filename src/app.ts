import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();


app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        message: "NEXAPAY API funcionando correctamente"
    });
});

app.use("/api", routes);

app.use(errorHandler);

export default app;
