import httpStatus from "http-status";
import ApiError from "../utils/ApiError";
import { roleRights } from "../configs/roles";
import prisma from "../configs/prisma";
import type { Request, Response, NextFunction } from "express";
import passport from "passport";

const verifyCallback =
  (
    req: Request,
    resolve: (value?: unknown) => void,
    reject: (reason?: any) => void,
    requiredRights: string[]
  ) =>
  async (err: any, user: any, info: any) => {
    if (err || info || !user) {
      return reject(
        new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized")
      );
    }
    req.user = user;

    if (requiredRights.length) {
      const userRights: string[] =
        user.role === "USER"
          ? await getClinicMemberPermissions(user.id)
          : roleRights.get(user.role.toLowerCase()) || [];
      const hasRequiredRights = requiredRights.every((requiredRight: string) =>
        userRights.includes(requiredRight)
      );

      if (!hasRequiredRights) {
        return reject(new ApiError(httpStatus.FORBIDDEN, "Forbidden"));
      }
    }
    if (user.isDeleted) {
      return reject(
        new ApiError(httpStatus.UNAUTHORIZED, "User account has been deleted")
      );
    }
    if (user.isRestricted) {
      return reject(new ApiError(httpStatus.FORBIDDEN, "User is restricted"));
    }

    resolve();
  };

const auth =
  (...requiredRights: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await new Promise((resolve, reject) => {
        passport.authenticate(
          "jwt",
          { session: false },
          verifyCallback(req, resolve, reject, requiredRights)
        )(req, res, next);
      });
      return next();
    } catch (err) {
      return next(err);
    }
  };

const getClinicMemberPermissions = async (
  userId: string
): Promise<string[]> => {
  const clinitian = await prisma.clinicMember.findFirst({
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

  if (!clinitian) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized");
  }

  const permissions = (clinitian.clinic.permissions || {}) as Record<
    string,
    boolean
  >;

  if (clinitian.role === "admin" || clinitian.role === "superAdmin") {
    return ["common", clinitian.role];
  }

  if (clinitian.role === "clinician") {
    return Object.keys(permissions).filter((key) => permissions[key] === true);
  }

  return [];
};

export default auth;
