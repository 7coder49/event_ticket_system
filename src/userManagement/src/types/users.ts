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
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  createdBy?: number | null;
  updatedBy?: number | null;
};