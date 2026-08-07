import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import usersRouter from "./controllers/users.ts";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Routes
app.use(usersRouter);

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "User Management Service is running 🚀",
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error("Global Error Handler caught:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 User Management Service running on http://localhost:${PORT}`);
});