import { IClinic } from "./clinic.interface";
import permissions from "../../configs/permissions";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import fs from "../../utils/fs";
import env from "../../configs/env";
import { Prisma } from "../../../generated/prisma/client";
import subscriptionService from "../subscription/subscription.service";
import crypto from "crypto";

const createClinic = async (
  data: Partial<IClinic> & { ownerEmail?: string },
) => {
  const { ownerEmail, name } = data;

  if (!ownerEmail) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Owner email is required");
  }

  if (!name) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Clinic name is required");
  }

  const user = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Generate public token
  const publicToken = crypto.randomBytes(32).toString("hex");

  // Build clinic data with only provided fields
  const clinicData: any = {
    name,
    ownerId: user.id,
    publicToken,
    members: {
      create: {
        userId: user.id,
        role: "superAdmin",
      },
    },
    permissions: permissions,
  };

  // Add optional fields only if they exist and are not undefined
  if (data.email !== undefined) clinicData.email = data.email;
  if (data.phoneNumber !== undefined) clinicData.phoneNumber = data.phoneNumber;
  if (data.address !== undefined) clinicData.address = data.address;
  if (data.logo !== undefined) clinicData.logo = data.logo;

  let clinic;
  try {
    clinic = await prisma.clinic.create({
      data: clinicData,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        members: true, // Include members to confirm creation
      },
    });

    // Assign default subscription (Free plan)
    try {
      await subscriptionService.assignDefaultSubscription(clinic.id);
    } catch (subscriptionError) {
      console.error(
        "Failed to assign default subscription:",
        subscriptionError,
      );
      // Don't fail clinic creation if subscription assignment fails
      // This can be handled later or retried
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ApiError(
          httpStatus.CONFLICT,
          "Clinic with this email already exists",
        );
      }
    }
    console.log(error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Unknown error occurred!");
  }

  return clinic;
};

const getClinicById = async (clinicId: string) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              phoneNumber: true,
              countryCode: true,
              bio: true,
              role: true,
            },
          },
        },
      },
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          phoneNumber: true,
          countryCode: true,
        },
      },
    },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  return clinic;
};

const updateClinic = async (
  clinicId: string,
  updateData: Partial<IClinic>,
  files: any,
) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  if (files?.logo?.[0]) {
    if (clinic.logo) {
      fs.deleteLocalFile(clinic.logo);
    }
    const file = files.logo[0];
    updateData.logo = env.BACKEND_URL + "/public" + fs.sanitizePath(file.path);
  }

  // Ensure we don't pass fields that cause type issues or shouldn't be updated directly
  const {
    id,
    owner,
    ownerId, // distinct ownerId to avoid accidental ownership transfer via this route
    members,
    clients,
    appointments,
    createdAt,
    updatedAt,
    ...dataToUpdate
  } = updateData;

  const updatedClinic = await prisma.clinic.update({
    where: { id: clinicId },
    data: dataToUpdate,
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return updatedClinic;
};

const deleteClinic = async (id: string) => {
  const clinic = await prisma.clinic.findUnique({ where: { id } });
  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }
  await prisma.clinic.delete({ where: { id } });
};

const getClinics = async (options: any) => {
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [clinics, totalDocs] = await Promise.all([
    prisma.clinic.findMany({
      take,
      skip,
      orderBy: sort,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.clinic.count(),
  ]);

  return {
    docs: clinics,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

const getClinicIdByUserId = async (userId: string) => {
  const clinic = await prisma.clinicMember.findFirst({
    where: { userId },
    select: {
      clinicId: true,
    },
  });

  return clinic?.clinicId;
};

export default {
  createClinic,
  getClinicById,
  updateClinic,
  deleteClinic,
  getClinics,
  getClinicIdByUserId,
};
