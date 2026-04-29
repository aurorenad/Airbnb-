import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Airbnb API",
      version: "1.0.0",
      description: "A comprehensive REST API for an Airbnb-style application, handling users, listings, bookings, and reviews with secure JWT authentication.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://airbnb-1c4y3dz0j-just-me11.vercel.app",  
        description: "Production server",
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/models/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  // Mount Swagger UI at /api-docs
  app.use("/api-docs", swaggerUi.serve);
  app.get("/api-docs", swaggerUi.setup(swaggerSpec));

  // Expose raw JSON spec at /api-docs.json
  app.get("/api-docs.json", (req, res) => {
    res.json(swaggerSpec);
  });

  console.log("Swagger docs available at http://localhost:3000/api-docs");
  console.log("Raw OpenAPI spec available at http://localhost:3000/api-docs.json");
}