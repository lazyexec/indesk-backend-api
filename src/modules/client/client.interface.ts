import { IUser } from "../user/user.interface";

interface IReminder {
  whatsapp: boolean;
  email: boolean;
}

export interface IClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  phoneNumber?: string;
  address?: any;
  note?: string;
  clinicId: string;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
