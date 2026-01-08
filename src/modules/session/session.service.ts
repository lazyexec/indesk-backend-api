import { ISession } from "./session.interface";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

const createSession = async (sessionBody: any): Promise<any> => {
  const session = await prisma.session.create({
    data: sessionBody,
  });
  return session;
};

const getSessions = async (filter: any, options: any) => {
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [sessions, totalDocs] = await Promise.all([
    prisma.session.findMany({
      where: filter,
      take,
      skip,
      orderBy: sort,
    }),
    prisma.session.count({ where: filter }),
  ]);

  return {
    docs: sessions,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
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

const updateSession = async (id: string, updateBody: any) => {
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
