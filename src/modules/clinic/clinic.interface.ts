import { IUser } from "../user/user.interface";

export interface IClinic {
  id: string;
  name: string;
  email?: string | null;
  url?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  address?: any; // Json in Prisma
  logo?: string | null;
  permissions?: any; // Json
  description?: string | null;
  color?: string | null;
  publicToken?: string | null;
  ownerId: string;
  owner?: IUser;
  // Relations - using `any` for now or better types if available
  members?: any[];
  clients?: any[];
  appointments?: any[];

  createdAt: Date;
  updatedAt: Date;
}
