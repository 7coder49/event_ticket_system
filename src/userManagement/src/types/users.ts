export type RegisterUserDto = {
  name: string;
  email: string;
  password: string;
  role?: string;
};

export type LoginUserDto = {
  email: string;
  password: string;
};

export type UserDbRow = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  created_at: Date;
};