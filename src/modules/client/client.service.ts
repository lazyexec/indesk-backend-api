import { IClient } from "./client.interface";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

const createClient = async (
  userId: string,
  clientBody: IClient
): Promise<any> => {
  // Destructure only the fields we need
  const {
    firstName,
    lastName,
    email,
    dateOfBirth,
    gender,
    phoneNumber,
    countryCode,
    address,
    insuranceProvider,
    insuranceNumber,
    insuranceAuthorizationNumber,
    note,
    status,
    clinicId,
    assignedClinicianId,
  } = clientBody;

  const clientExists = await prisma.client.findFirst({
    where: { email },
  });

  if (clientExists) {
    throw new ApiError(httpStatus.CONFLICT, "Email already Occupied!");
  }

  const clinicMember = await prisma.clinicMember.findUnique({
    where: { id: assignedClinicianId },
    select: { clinicId: true },
  });

  if (!clinicMember) {
    throw new ApiError(httpStatus.NOT_FOUND, "Assigned clinician not found");
  }

  if (clinicMember.clinicId !== clinicId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Assigned clinician does not belong to this clinic"
    );
  }

  // Verify clinic exists and user has access
  const clinicAccess = await prisma.clinicMember.findFirst({
    where: {
      clinicId,
      userId,
    },
  });

  if (!clinicAccess) {
    throw new ApiError(403, "You don't have access to this clinic");
  }

  const client = await prisma.client.create({
    data: {
      firstName,
      lastName,
      email,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      phoneNumber,
      countryCode,
      address,
      insuranceProvider,
      insuranceNumber,
      insuranceAuthorizationNumber,
      note,
      status,
      clinicId,
      assignedClinicianId,
      addedBy: userId,
    },
    include: {
      assignedClinician: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      clinic: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return client;
};

const getClients = async (filter: any, options: any) => {
  console.log(filter, options);
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;
  const { search, status, ...restFilter } = filter;

  const where: any = {
    ...restFilter,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
    status && (where.status = status);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [clients, totalDocs] = await Promise.all([
    prisma.client.findMany({
      where,
      take,
      skip,
      orderBy: sort,
      include: {
        assignedClinician: true,
      },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    docs: clients,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

const getClientById = async (id: string) => {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      assignedClinician: {
        select: {
          user: {
            select: {
              id: true,
              avatar: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      addedByUser: {
        select: {
          id: true,
          avatar: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      appointments: true,
      notes: true,
      assessments: true,
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
  }
  return client;
};

const updateClient = async (id: string, updateBody: Partial<IClient>) => {
  await getClientById(id);
  const updatedClient = await prisma.client.update({
    where: { id },
    data: updateBody,
  });
  return updatedClient;
};

const deleteClient = async (id: string) => {
  await getClientById(id);
  const deletedClient = await prisma.client.delete({
    where: { id },
  });
  return deletedClient;
};

export default {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
};
