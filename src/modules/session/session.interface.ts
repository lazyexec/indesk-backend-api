import { IUser } from "../user/user.interface";

export interface ISession {
  id: string;
  name: string;
  duration: number;
  description?: string;
  price: number;
  color?: string;
  reminders?: number[]; // Array of minutes before appointment (default: [120, 60] = 2hr, 1hr)
  reminderMethod?: "notification" | "sms" | "email" | "all";
  enableSmsReminders?: boolean;
  enableEmailReminders?: boolean;
  clinicId: string;
  owner?: IUser;
  // Relations - using `any` for now or better types if available
  members?: any[];
  clients?: any[];
  appointments?: any[];

  createdAt: Date;
  updatedAt: Date;
}
