import { IUser } from "../user/user.interface";

export interface IClinic {
  id: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  address?: any; // Json in Prisma
  logo?: string | null;
  permissions?: any; // Json
  ownerId: string;
  owner?: IUser;
  // Relations - using `any` for now or better types if available
  members?: any[];
  clients?: any[];
  appointments?: any[];

  createdAt: Date;
  updatedAt: Date;
}
