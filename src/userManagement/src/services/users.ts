import pool from "../db.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RegisterUserDto, UserDbRow } from "../types/users.ts";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

export async function findUserByEmail(email: string): Promise<UserDbRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, password, role, createdAt, updatedAt, deletedAt, createdBy, updatedBy FROM users WHERE email = ?",
    [email]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0] as UserDbRow;
}

export async function registerUser(user: RegisterUserDto): Promise<Omit<UserDbRow, "password">> {
  // Hash the password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(user.password, salt);
  const role = user.role || "user";

  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    [user.name, user.email, hashedPassword, role]
  );

  const insertId = result.insertId;

  return {
    id: insertId,
    name: user.name,
    email: user.email,
    role: role,
    createdAt: new Date(),
  };
}

export async function loginUser(email: string, password: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return null;
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return token;
}