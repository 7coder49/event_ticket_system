import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;

// Security and Defensive Coding Configurations
app.use(helmet());

// Access Control: Explicitly define permitted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
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
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // default 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});

app.use(limiter);

// Note: Do not parse JSON globally if we proxy raw payloads to downstream services.
// Raw body proxying with http-proxy-middleware is much cleaner and doesn't suffer from body-parsing conflicts
// (where http-proxy-middleware hangs because express.json() consumed the stream).
// Therefore, we do NOT use app.use(express.json()) at the gateway level.

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API Gateway is running 🚀",
  });
});

// User Service
app.use(
  "/users",
  createProxyMiddleware({
    target: "http://localhost:3001",
    changeOrigin: true,
  })
);

// Event Service
app.use(
  "/events",
  createProxyMiddleware({
    target: "http://localhost:3002",
    changeOrigin: true,
  })
);

// Booking Service
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
});