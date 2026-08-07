import mongoose from "mongoose";
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { Event } from "../models/event.ts";

export interface BookTicketResult {
  success: boolean;
  message: string;
  data?: {
    bookingId: number;
    eventId: string;
    ticketsBooked: number;
    remainingTickets: number;
  };
}

export async function bookTicketService(
  userId: number,
  eventId: string,
  tickets: number,
  db: Pool
): Promise<BookTicketResult> {
  let connection: PoolConnection | null = null;
  try {
    // 1. Start MySQL transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 2. Insert booking record in MySQL
    const [insertResult] = await connection.query<ResultSetHeader>(
      "INSERT INTO bookings (userId, eventId, ticketsBooked) VALUES (?, ?, ?)",
      [userId, eventId, tickets]
    );

    // 3. Atomically decrement ticket count in MongoDB
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(eventId), totalTickets: { $gte: tickets } },
      { $inc: { totalTickets: -tickets } },
      { new: true }
    ).exec();

    if (!updatedEvent) {
      // No tickets available or event not found. Rollback MySQL transaction.
      await connection.rollback();
      return {
        success: false,
        message: "Booking Failed: Event not found or insufficient tickets available.",
      };
    }

    // 4. Commit MySQL transaction
    await connection.commit();

    return {
      success: true,
      message: "Tickets Booked Successfully",
      data: {
        bookingId: insertResult.insertId,
        eventId,
        ticketsBooked: tickets,
        remainingTickets: updatedEvent.totalTickets,
      },
    };
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Failed to rollback MySQL transaction:", rollbackErr);
      }
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function getUserBookingsService(userId: number, db: Pool) {
  // 1. Fetch bookings from MySQL
  const [bookings] = await db.query<RowDataPacket[]>(
    "SELECT id, userId, eventId, ticketsBooked, createdAt FROM bookings WHERE userId = ? ORDER BY createdAt DESC",
    [userId]
  );

  if (bookings.length === 0) {
    return [];
  }

  // 2. Fetch event names from MongoDB
  const eventIds = bookings.map((b) => new mongoose.Types.ObjectId(b.eventId));
  const events = await Event.find({ _id: { $in: eventIds } }).exec();

  // Create a map for easy lookup
  const eventMap = new Map<string, typeof events[0]>();
  events.forEach((event) => {
    eventMap.set(event._id.toString(), event);
  });

  // 3. Join the data in application layer
  const joinedBookings = bookings.map((booking) => {
    const eventDetail = eventMap.get(booking.eventId);
    return {
      bookingId: booking.id,
      userId: booking.userId,
      eventId: booking.eventId,
      eventName: eventDetail ? eventDetail.title : "Unknown Event",
      ticketsBooked: booking.ticketsBooked,
      eventDate: eventDetail ? eventDetail.date : null,
      eventLocation: eventDetail ? eventDetail.location : null,
      createdAt: booking.createdAt,
    };
  });

  return joinedBookings;
}
