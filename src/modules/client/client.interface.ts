import { IUser } from "../user/user.interface";

export interface IClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  phoneNumber?: string;
  countryCode?: string;
  status: any;
  address?: any;
  note?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  insuranceAuthorizationNumber?: string;
  clinicId: string;
  assignedClinicianId?: string;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
