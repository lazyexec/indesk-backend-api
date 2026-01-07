import { ISession } from "./apointment.interface";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

const createSession = async (userId: string, sessionBody: ISession): Promise<any> => {
  const session = await prisma.session.create({
    data: {
      ...sessionBody,
      clinicianId: userId,
    },
  });
  return session;
};

const getSessions = async (filter: any, options: any) => {
  const { limit = 10, page = 1, sort = "createdAt_desc" } = options;
  const sessions = await prisma.session.findMany({
    where: filter,
    take: Number(limit),
    skip: (Number(page) - 1) * Number(limit),
    orderBy: {
      [sort.split("_")[0]]: sort.split("_")[1] === "desc" ? "desc" : "asc",
    },
  });
  return sessions;
};

const getSessionById = async (id: string) => {
  const session = await prisma.session.findUnique({
    where: { id },
  });
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, "Session not found");
  }
  return session;
};

const updateSession = async (id: string, updateBody: ISession) => {
  await getSessionById(id);
  const updatedSession = await prisma.session.update({
    where: { id },
    data: updateBody,
  });
  return updatedSession;
};

const deleteSession = async (id: string) => {
  await getSessionById(id);
  const deletedSession = await prisma.session.delete({
    where: { id },
  });
  return deletedSession;
};

export default {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
};
