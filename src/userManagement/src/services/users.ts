import pool from '../db.ts';
import type { RegisterUser } from '../types/users.ts';

async function registerUser(user: RegisterUser) {
  const users = await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [user.name, user.email, user.password]);

  return users;
}

export { registerUser };