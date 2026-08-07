import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import eventsRouter from "./controllers/events.ts";

const app = express();
const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/event_management";

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("🍃 Connected to MongoDB (Event Management)"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Middleware
app.use(express.json());

// Routes
app.use("/events", eventsRouter);

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Event Management Service is running 🚀",
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
  console.log(`🚀 Event Management Service running on http://localhost:${PORT}`);
});
