import { Router } from "express";
import Joi from "joi";
import { authenticateToken } from "../middleware/auth.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validation.ts";
import { bookTicketService, getUserBookingsService } from "../services/bookings.ts";

const router = Router();

// Validation schema for booking tickets
const bookTicketSchema = Joi.object({
  eventId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "eventId must be a valid 24-character hexadecimal MongoDB ObjectId",
    }),
  tickets: Joi.number().integer().min(1).optional().default(1),
});

// Book Ticket - Authenticated Users Only
router.post(
  "/",
  authenticateToken as any,
  validateBody(bookTicketSchema),
  async (req: AuthenticatedRequest, res, next) => {
    const db = (req.app.get("mysqlPool") as any);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { eventId, tickets } = req.body;

    try {
      const result = await bookTicketService(userId, eventId, tickets, db);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// View My Tickets - Authenticated Users Only
router.get(
  "/my-tickets",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res, next) => {
    const db = (req.app.get("mysqlPool") as any);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    try {
      const joinedBookings = await getUserBookingsService(userId, db);

      res.json({
        success: true,
        data: joinedBookings,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
