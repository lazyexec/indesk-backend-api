import { IUser } from "../user/user.interface";

interface IReminder {
  whatsapp: boolean;
  email: boolean;
}

export interface ISession {
  id: string;
  name: string;
  duration: number;
  description?: string;
  price: number;
  color?: string;
  reminders?: any;
  clinicId: string;
  owner?: IUser;
  // Relations - using `any` for now or better types if available
  members?: any[];
  clients?: any[];
  appointments?: any[];

  createdAt: Date;
  updatedAt: Date;
}
