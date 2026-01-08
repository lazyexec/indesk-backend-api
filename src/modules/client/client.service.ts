import { IClient } from "./client.interface";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

const createClient = async (
  userId: string,
  clientBody: IClient
): Promise<any> => {
  const client = await prisma.client.create({
    data: {
      ...clientBody,
      addedBy: userId,
    },
  });
  return client;
};

const getClients = async (filter: any, options: any) => {
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;
  const { search, ...restFilter } = filter;

  const where: any = {
    ...restFilter,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [clients, totalDocs] = await Promise.all([
    prisma.client.findMany({
      where,
      take,
      skip,
      orderBy: sort,
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

const queryClients = getClients;

const getClientById = async (id: string) => {
  const client = await prisma.client.findUnique({
    where: { id },
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
  queryClients,
  getClientById,
  updateClient,
  deleteClient,
};
