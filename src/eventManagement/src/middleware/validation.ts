import type { Request, Response, NextFunction } from "express";
import type { Schema } from "joi";

export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      res.status(400).json({
        success: false,
        message: "Validation Error",
        errors,
      });
      return;
    }
    next();
  };
}
