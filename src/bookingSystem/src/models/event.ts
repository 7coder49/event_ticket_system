import mongoose from "mongoose";

export interface IEvent extends mongoose.Document {
  title: string;
  description: string;
  date: Date;
  location: string;
  totalTickets: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new mongoose.Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    totalTickets: { type: Number, required: true, min: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: "event_management", // Target the exact same collection
  }
);

export const Event = mongoose.model<IEvent>("Event", EventSchema);
