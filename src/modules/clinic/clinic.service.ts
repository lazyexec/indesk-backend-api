import { IClinic } from "./clinic.interface";
import permissions from "../../configs/permissions";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import fs from "../../utils/fs";
import env from "../../configs/env";

const createClinic = async (
  data: Partial<IClinic> & { ownerEmail?: string }
) => {
  const { ownerEmail, name, email, phoneNumber, address, logo } = data;

  if (!ownerEmail) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Owner email is required");
  }

  const user = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const clinic = await prisma.clinic.create({
    data: {
      name: name!,
      ownerId: user.id,
      email,
      phoneNumber,
      address,
      members: {
        create: {
          userId: user.id,
          role: "superAdmin",
        },
      },
      permissions: permissions,
      logo,
    },
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
  return clinic;
};

const getClinicById = async (clinicId: string) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
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

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  return clinic;
};

const updateClinic = async (
  clinicId: string,
  updateData: Partial<IClinic>,
  files: any
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
  const clinic = await prisma.clinic.delete({ where: { id } });
  return clinic;
};

const getClinics = async (options: any) => {
  const { limit = 10, page = 1, sort = "createdAt_desc" } = options;
  const clinics = await prisma.clinic.findMany({
    take: limit,
    skip: (page - 1) * limit,
    orderBy: {
      createdAt: sort === "createdAt_desc" ? "desc" : "asc",
    },
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
  return clinics;
};

export default {
  createClinic,
  getClinicById,
  updateClinic,
  deleteClinic,
  getClinics,
};
