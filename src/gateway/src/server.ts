import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

const app = express();
const PORT = process.env.PORT || 3000;

// Security and Defensive Coding Configurations
// Allow Swagger UI inline scripts & styles through Content Security Policy (CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https://validator.swagger.io"],
      },
    },
  })
);

// Access Control: Explicitly define permitted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Traffic Control: Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});

app.use(limiter);

// Consolidated OpenAPI Specification
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Event & Ticket System API Documentation",
    version: "1.0.0",
    description: "Unified interactive API documentation for the User, Event, and Booking microservices.",
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: "API Gateway Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Input JWT token received from user login to authenticate.",
      },
    },
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "John Doe" },
          email: { type: "string", format: "email", example: "john@example.com" },
          password: { type: "string", minLength: 6, example: "secure123" },
          role: { type: "string", enum: ["user", "admin"], default: "user", example: "user" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "john@example.com" },
          password: { type: "string", example: "secure123" },
        },
      },
      CreateEventRequest: {
        type: "object",
        required: ["title", "description", "date", "location", "totalTickets"],
        properties: {
          title: { type: "string", example: "Microservices Workshop 2026" },
          description: { type: "string", example: "Hands-on workshop building microservices with Node.js and Docker." },
          date: { type: "string", format: "date-time", example: "2026-10-15T09:00:00.000Z" },
          location: { type: "string", example: "Virtual - Zoom" },
          totalTickets: { type: "integer", minimum: 0, example: 50 },
          metadata: {
            type: "object",
            properties: {
              speaker: { type: "string", example: "Martin Fowler" },
              difficulty: { type: "string", example: "Intermediate" },
            },
          },
        },
      },
      BookTicketRequest: {
        type: "object",
        required: ["eventId"],
        properties: {
          eventId: { type: "string", pattern: "^[0-9a-fA-F]{24}$", example: "6a757735b305576129b4780d" },
          tickets: { type: "integer", minimum: 1, default: 1, example: 1 },
        },
      },
    },
  },
  paths: {
    "/users/register": {
      post: {
        summary: "Register a new user account",
        tags: ["User Management"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          201: { description: "User registered successfully" },
          400: { description: "Email already exists or validation failed" },
        },
      },
    },
    "/users/login": {
      post: {
        summary: "Log in and obtain a JWT bearer token",
        tags: ["User Management"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: { description: "Authentication successful; returns authorization token" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/events": {
      post: {
        summary: "Create a new event (Admin only)",
        tags: ["Event Management"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateEventRequest" },
            },
          },
        },
        responses: {
          201: { description: "Event created successfully" },
          401: { description: "Missing or invalid token" },
          403: { description: "Access Denied: Insufficient Permissions (admin role required)" },
          400: { description: "Validation error" },
        },
      },
      get: {
        summary: "List all events (Public with pagination)",
        tags: ["Event Management"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Page number" },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 }, description: "Page size" },
        ],
        responses: {
          200: { description: "Event listings and pagination details retrieved successfully" },
        },
      },
    },
    "/bookings": {
      post: {
        summary: "Book tickets for an event (User only)",
        tags: ["Booking System"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BookTicketRequest" },
            },
          },
        },
        responses: {
          201: { description: "Tickets booked successfully" },
          400: { description: "Insufficient tickets available, invalid event ID, or database conflict" },
          401: { description: "Missing or invalid token" },
        },
      },
    },
    "/bookings/my-tickets": {
      get: {
        summary: "View my booked tickets (User only)",
        tags: ["Booking System"],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "List of bookings joined with MongoDB event names, dates, and locations" },
          401: { description: "Missing or invalid token" },
        },
      },
    },
  },
};

// Mount Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API Gateway is running 🚀",
  });
});

// Proxy routes for downstream services
app.use(
  "/users",
  createProxyMiddleware({
    target: "http://localhost:3001",
    changeOrigin: true,
  })
);

app.use(
  "/events",
  createProxyMiddleware({
    target: "http://localhost:3002",
    changeOrigin: true,
  })
);

app.use(
  "/bookings",
  createProxyMiddleware({
    target: "http://localhost:3003",
    changeOrigin: true,
  })
);

// Handle Unknown Routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation available at http://localhost:${PORT}/api-docs`);
});