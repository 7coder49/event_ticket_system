import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import mysql from "mysql2/promise";
import bookingsRouter from "./controllers/bookings.ts";

const app = express();
const PORT = process.env.PORT || 3003;

// 1. MySQL Pool Initialization
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "booking_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.set("mysqlPool", pool);
console.log("🐬 Connected to MySQL (Booking System)");

// 2. MongoDB Mongoose Initialization
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/event_management";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("🍃 Connected to MongoDB (Booking System)"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Middleware
app.use(express.json());

// Routes
app.use(bookingsRouter);

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Booking System Service is running 🚀",
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
  console.log(`🚀 Booking System Service running on http://localhost:${PORT}`);
});
