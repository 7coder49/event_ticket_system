import { Router } from "express";
import Joi from "joi";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import mongoose from "mongoose";
import { Event } from "../models/event.ts";
import { authenticateToken } from "../middleware/auth.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validation.ts";

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

    let connection: PoolConnection | null = null;
    try {
      // 1. Start MySQL transaction
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 2. Insert booking record in MySQL
      const [insertResult] = await connection.query<ResultSetHeader>(
        "INSERT INTO bookings (user_id, event_id, tickets_booked) VALUES (?, ?, ?)",
        [userId, eventId, tickets]
      );

      // 3. Atomically decrement ticket count in MongoDB
      // Use filter condition `totalTickets: { $gte: tickets }` to ensure availability during decrement
      const updatedEvent = await Event.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(eventId), totalTickets: { $gte: tickets } },
        { $inc: { totalTickets: -tickets } },
        { new: true }
      ).exec();

      if (!updatedEvent) {
        // No tickets available or event not found. Rollback MySQL transaction.
        await connection.rollback();
        res.status(400).json({
          success: false,
          message: "Booking Failed: Event not found or insufficient tickets available.",
        });
        return;
      }

      // 4. Commit MySQL transaction
      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Tickets Booked Successfully",
        data: {
          bookingId: insertResult.insertId,
          eventId,
          ticketsBooked: tickets,
          remainingTickets: updatedEvent.totalTickets,
        },
      });
    } catch (error: any) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackErr) {
          console.error("Failed to rollback MySQL transaction:", rollbackErr);
        }
      }
      next(error);
    } finally {
      if (connection) {
        connection.release();
      }
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
      // 1. Fetch bookings from MySQL
      const [bookings] = await db.query<RowDataPacket[]>(
        "SELECT id, user_id, event_id, tickets_booked, created_at FROM bookings WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
      );

      if (bookings.length === 0) {
        res.json({
          success: true,
          data: [],
        });
        return;
      }

      // 2. Fetch event names from MongoDB
      const eventIds = bookings.map((b) => new mongoose.Types.ObjectId(b.event_id));
      const events = await Event.find({ _id: { $in: eventIds } }).exec();

      // Create a map for easy lookup
      const eventMap = new Map<string, typeof events[0]>();
      events.forEach((event) => {
        eventMap.set(event._id.toString(), event);
      });

      // 3. Join the data in application layer
      const joinedBookings = bookings.map((booking) => {
        const eventDetail = eventMap.get(booking.event_id);
        return {
          bookingId: booking.id,
          userId: booking.user_id,
          eventId: booking.event_id,
          eventName: eventDetail ? eventDetail.title : "Unknown Event",
          ticketsBooked: booking.tickets_booked,
          eventDate: eventDetail ? eventDetail.date : null,
          eventLocation: eventDetail ? eventDetail.location : null,
          createdAt: booking.created_at,
        };
      });

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
