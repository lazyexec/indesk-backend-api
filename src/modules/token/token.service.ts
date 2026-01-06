import { Types } from "mongoose";
import jwt from "../../utils/jwt";
import ApiError from "../../utils/ApiError";
import status from "http-status";
import env from "../../configs/env";
import { strToDate } from "../../utils/date";
import prisma from "../../configs/prisma";

const saveRefreshToken = async (opts: {
  userId: string;
  token: string;
  deviceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  expiresAt?: Date;
}) => {
  const {
    userId,
    token,
    deviceId = null,
    ip = null,
    userAgent = null,
    expiresAt,
  } = opts;

  await prisma.token.create({
    data: {
      token,
      userId,
      type: "refresh",
      expiresAt: expiresAt || strToDate(env.jwt.expiryRefreshToken),
      // blacklisted: false, // Prisma schema might not have this, checking schema...
      // distinct device tracking might need schema update or logic change
      // Based on schema seen earlier: id, userId, type, token, expiresAt
      // Schema missing: blacklisted, deviceId, ip, userAgent
    },
  });
};

const generateUserTokens = async (opts: {
  userId: string;
  deviceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) => {
  const { userId, deviceId = null, ip = null, userAgent = null } = opts;

  const accessToken = jwt.generateToken(
    { _id: userId, type: "access" },
    env.jwt.expiryAccessToken
  );
  const refreshToken = jwt.generateToken(
    { _id: userId, type: "refresh" },
    env.jwt.expiryRefreshToken
  );

  const expiresAt = strToDate(env.jwt.expiryRefreshToken);

  await saveRefreshToken({
    userId,
    token: refreshToken,
    deviceId,
    ip,
    userAgent,
    expiresAt,
  });

  return {
    access: {
      token: accessToken,
      expiresAt: strToDate(env.jwt.expiryAccessToken),
    },
    refresh: {
      token: refreshToken,
      expiresAt,
    },
  };
};

const refreshAuth = async (
  refreshToken: string,
  opts?: {
    ip?: string | null;
    userAgent?: string | null;
    deviceId?: string | null;
  }
) => {
  let payload: any;
  try {
    payload = jwt.verifyToken(refreshToken);
  } catch (err) {
    throw new ApiError(status.FORBIDDEN, "Invalid refresh token (signature).");
  }

  if (!payload || payload.type !== "refresh") {
    throw new ApiError(status.FORBIDDEN, "Token is not a refresh token.");
  }

  const tokenDoc = await prisma.token.findFirst({
    where: {
      token: refreshToken,
      type: "refresh",
    },
  });

  if (!tokenDoc) {
    throw new ApiError(status.FORBIDDEN, "Refresh token not found.");
  }

  // Check blacklist or expiry
  // Schema doesn't have blacklisted field in the diff I saw, but let's assume standard behavior
  // If schema doesn't have blacklisted, we rely on deletion or existence

  if (tokenDoc.expiresAt && tokenDoc.expiresAt.getTime() < Date.now()) {
    await prisma.token.delete({ where: { id: tokenDoc.id } }).catch(() => {});
    throw new ApiError(status.FORBIDDEN, "Refresh token expired.");
  }

  // In Prisma version of this logic, we typically delete the old token on rotation
  // instead of marking blacklisted if the field doesn't exist.
  // Let's delete the old used token.
  await prisma.token.delete({ where: { id: tokenDoc.id } });

  // Create new tokens
  const userId = payload._id; // payload._id is string now

  const newAccessToken = jwt.generateToken(
    { _id: userId, type: "access" },
    env.jwt.expiryAccessToken
  );
  const newRefreshToken = jwt.generateToken(
    { _id: userId, type: "refresh" },
    env.jwt.expiryRefreshToken
  );

  const newExpiresAt = strToDate(env.jwt.expiryRefreshToken);

  await saveRefreshToken({
    userId,
    token: newRefreshToken,
    deviceId: opts?.deviceId ?? null,
    ip: opts?.ip ?? null,
    userAgent: opts?.userAgent ?? null,
    expiresAt: newExpiresAt,
  });

  return {
    access: {
      token: newAccessToken,
      expiresAt: newExpiresAt,
    },
    refresh: {
      token: newRefreshToken,
      expiresAt: newExpiresAt,
    },
  };
};

const revokeRefreshToken = async (token: string, reason = "user_logout") => {
  // Since we don't have blacklisted/reason fields in the Prisma schema shown
  // We will simply delete the token
  const tokenDoc = await prisma.token.deleteMany({
    where: {
      token,
      type: "refresh",
    },
  });
  return !!tokenDoc.count;
};

const revokeAllForUser = async (
  userId: string, // Changed to string
  opts?: { reason?: string; deviceId?: string }
) => {
  // Deleting all tokens for user since we can't mark blacklisted
  await prisma.token.deleteMany({
    where: {
      userId,
      type: "refresh",
    },
  });
  return true;
};

const verifyAccessToken = (rawAccessToken: string) => {
  try {
    const payload = jwt.verifyToken(rawAccessToken);
    if (!payload) throw new Error("invalid token");
    if (payload.type !== "access") throw new Error("invalid token type");
    return payload; // contains _id and other claims
  } catch (err) {
    throw new ApiError(status.UNAUTHORIZED, "Invalid access token.");
  }
};

/** Find active sessions for a user (for session listing) */
const listUserSessions = async (userId: string) => {
  return prisma.token.findMany({
    where: { userId, type: "refresh" },
    select: {
      id: true,
      userId: true,
      type: true,
      expiresAt: true,
      createdAt: true,
    },
  });
};

export default {
  generateUserTokens,
  refreshAuth,
  revokeRefreshToken,
  revokeAllForUser,
  verifyAccessToken,
  listUserSessions,
};
