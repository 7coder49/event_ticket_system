import { Event } from "../models/event.ts";

export interface CreateEventInput {
  title: string;
  description: string;
  date: string | Date;
  location: string;
  totalTickets: number;
  metadata?: Record<string, any>;
}

export async function createEventService(data: CreateEventInput) {
  const { title, description, date, location, totalTickets, metadata } = data;

  const newEvent = new Event({
    title,
    description,
    date: new Date(date),
    location,
    totalTickets,
    metadata: metadata || {},
  });

  return await newEvent.save();
}

export async function listEventsService(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    Event.find().skip(skip).limit(limit).exec(),
    Event.countDocuments(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}
