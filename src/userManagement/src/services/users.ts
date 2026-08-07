import pool from "../db.ts";
import bcrypt from "bcryptjs";
import type { RegisterUserDto, UserDbRow } from "../types/users.ts";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export async function findUserByEmail(email: string): Promise<UserDbRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, password, role, created_at FROM users WHERE email = ?",
    [email]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0] as UserDbRow;
}

export async function registerUser(user: RegisterUserDto): Promise<Omit<UserDbRow, "password">> {
  // Hash the password
  const salt = await bcrypt.genSalt(10);
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
    created_at: new Date(),
  };
}