import { Router } from "express";
import Joi from "joi";
import { Event } from "../models/event.ts";
import { authenticateToken, authorizeRole } from "../middleware/auth.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validation.ts";

const router = Router();

// Validation schema for creating events
const createEventSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  description: Joi.string().min(10).required(),
  date: Joi.date().iso().required(),
  location: Joi.string().required(),
  totalTickets: Joi.number().integer().min(0).required(),
  metadata: Joi.object().optional().default({}),
});

// Create Event - Admin only
router.post(
  "/",
  authenticateToken as any,
  authorizeRole(["admin"]) as any,
  validateBody(createEventSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { title, description, date, location, totalTickets, metadata } = req.body;

      const newEvent = new Event({
        title,
        description,
        date: new Date(date),
        location,
        totalTickets,
        metadata,
      });

      const savedEvent = await newEvent.save();

      res.status(201).json({
        success: true,
        message: "Event Created Successfully",
        data: savedEvent,
      });
    } catch (error) {
      next(error);
    }
  }
);

// List Events - Public with pagination
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find().skip(skip).limit(limit).exec(),
      Event.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
