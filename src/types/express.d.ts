import { IUser } from "../modules/user/user.interface";

interface DeviceInfo {
  userAgent: string;
  ip: string | undefined;
  host: string | null;
  port: string | null;
  origin: string | null;
  referer: string | null;
  protocol: string;
  method: string;
  path: string;
  acceptLanguage: string | null;
}

declare global {
  namespace Express {
    interface User extends IUser {
      id?: string;
      role?: string;
      name?: string;
      fcmToken?: string
    }

    interface Request {
      device?: DeviceInfo;
      rawBody?: string;
    }
  }
}
