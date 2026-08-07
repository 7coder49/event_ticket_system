import { Router } from "express";
import Joi from "joi";
import { registerUser, findUserByEmail, loginUser } from "../services/users.ts";
import { validateBody } from "../middleware/validation.ts";

const router = Router();

// Validation Schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  role: Joi.string().valid("user", "admin").optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Register Endpoint
router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
      return;
    }

    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "User Registered Successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// Login Endpoint
router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const token = await loginUser(email, password);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    res.json({
      success: true,
      message: "Authentication Successful",
      token,
    });
  } catch (error) {
    next(error);
  }
});

export default router;