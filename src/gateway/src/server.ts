import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

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