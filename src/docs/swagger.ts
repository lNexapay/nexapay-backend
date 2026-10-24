import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NexaPay API",
      version: "1.0.0",
      description: "API de la billetera digital NexaPay",
    },
  },
  apis: ["./src/routes/*.ts"],
});