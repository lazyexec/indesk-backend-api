import jwt from "jsonwebtoken";
import env from "../configs/env";
import ApiError from "./ApiError";
import status from "http-status";

const decodeToken = (token: string): any => {
  const decoded = jwt.decode(token, { complete: true });
  return decoded;
};

const verifyToken = (token: string): any => {
  try {
    const verified = jwt.verify(token, env.jwt.secret);
    return verified;
  } catch (error) {
    throw new ApiError(status.FORBIDDEN, "Invalid or expired token");
  }
};

const generateToken = (
  payload: object,
  expiresIn = env.jwt.expiryAccessToken
): string => {
  return jwt.sign(payload, env.jwt.secret, { expiresIn });
};

export default {
  decodeToken,
  verifyToken,
  generateToken,
};
