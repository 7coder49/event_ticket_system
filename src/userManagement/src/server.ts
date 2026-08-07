import express from "express";
import type { Request, Response } from "express";
import usersRouter from "./controllers/users.ts";

const app = express();

app.use(usersRouter);

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "User Management Service is running 🚀",
  });
});

app.listen(3001, () => {
  console.log(`🚀 User Management Service running on http://localhost:3001`);
});