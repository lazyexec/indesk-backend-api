import httpStatus from "http-status";
import ApiError from "../utils/ApiError";
import { roleRights } from "../configs/roles";
import prisma from "../configs/prisma";
import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import all_permissions from "../configs/permissions";

const verifyCallback =
  (
    req: Request,
    resolve: () => void,
    reject: (error: ApiError) => void,
    requiredRights: string[],
  ) =>
  async (err: Error | null, user: any | false, info: any) => {
    // Handle authentication errors
    if (err) {
      return reject(
        new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Authentication error"),
      );
    }
    if (info || !user) {
      return reject(
        new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized"),
      );
    }

    // Check user status FIRST
    if (user.isDeleted) {
      return reject(new ApiError(httpStatus.UNAUTHORIZED, "User Not Found!"));
    }
    if (user.isRestricted) {
      return reject(
        new ApiError(
          httpStatus.FORBIDDEN,
          "User is restricted, Please contact support",
        ),
      );
    }

    // Populate clinic ID for the user
    const clinicId = await getClinicIdForUser(user.id);
    user.clinicId = clinicId;

    req.user = user;

    // Then check permissions
    if (user.role !== "provider" && requiredRights.length > 0) {
      const userRights = await getUserPermissions(user);
      const hasRequiredRights = requiredRights.some((right) =>
        userRights.includes(right),
      );

      if (!hasRequiredRights) {
        return reject(new ApiError(httpStatus.FORBIDDEN, "Forbidden!"));
      }
    }
    resolve();
  };

const getClinicIdForUser = async (userId: string): Promise<string | null> => {
  // First check if user owns a clinic
  const ownedClinic = await prisma.clinic.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  if (ownedClinic) {
    return ownedClinic.id;
  }

  // Then check if user is a member of a clinic
  const clinicMember = await prisma.clinicMember.findFirst({
    where: { userId },
    select: { clinicId: true },
  });

  return clinicMember?.clinicId || null;
};

const getUserPermissions = async (user: any): Promise<string[]> => {
  if (user.role !== "user") {
    return roleRights.get(user.role) || [];
  }
  return getClinicMemberPermissions(user.id);
};

const auth =
  (...requiredRights: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    return new Promise<void>((resolve, reject) => {
      passport.authenticate(
        "jwt",
        { session: false },
        verifyCallback(req, resolve, reject, requiredRights),
      )(req, res, (err?: any) => {
        if (err) {
          return next(err);
        }
        // Don't call next() here - let resolve/reject handle it
      });
    })
      .then(() => next())
      .catch((err) => next(err));
  };

const getClinicMemberPermissions = async (
  userId: string,
): Promise<string[]> => {
  // First check if user is a clinic member
  const clinician = await prisma.clinicMember.findFirst({
    where: { userId },
    select: {
      role: true,
      clinic: {
        select: {
          permissions: true,
        },
      },
    },
  });

  if (clinician) {
    const ALL_PERMISSION_KEYS = Object.keys(all_permissions);
    if (clinician.role === "superAdmin") {
      return [
        "common",
        "commonAdmin",
        "admin",
        "superAdmin",
        ...ALL_PERMISSION_KEYS,
      ];
    }

    if (clinician.role === "admin") {
      return ["common", "commonAdmin", "admin", ...ALL_PERMISSION_KEYS];
    }

    const permissions = (clinician.clinic.permissions || {}) as Record<
      string,
      boolean
    >;

    if (clinician.role === "clinician") {
      return Object.keys(permissions).filter(
        (key) => permissions[key] === true,
      );
    }
  }

  // Fallback: Check if user is a clinic owner (for cases where clinicMember record doesn't exist yet)
  const ownedClinic = await prisma.clinic.findFirst({
    where: { ownerId: userId },
    select: {
      id: true,
    },
  });

  // If user owns a clinic but has no clinicMember record, give them all permissions
  if (ownedClinic) {
    const ALL_PERMISSION_KEYS = Object.keys(all_permissions);
    return [
      "common",
      "commonAdmin",
      "admin",
      "superAdmin",
      ...ALL_PERMISSION_KEYS,
    ];
  }

  // No clinic association at all
  return ["common"];
};

export default auth;

// TODO: what if the clinician exists in multiple clinics?
