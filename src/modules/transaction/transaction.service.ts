import prisma from "../../configs/prisma";
const getAllTransactions = async (filter: any, options: any) => {
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);
  const [transactions, totalDocs] = await Promise.all([
    prisma.transaction.findMany({
      where: filter,
      take,
      skip,
      orderBy: sort,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        session: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
      },
    }),
    prisma.transaction.count({ where: filter }),
  ]);
  return {
    docs: transactions,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

const getTransaction = async (id: string) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      client: true,
      session: true,
    },
  });
  return transaction;
};

const deleteTransaction = async (id: string) => {
  await prisma.transaction.delete({
    where: { id },
  });
};

const createTransaction = async (data: {
  clientId: string;
  sessionId: string;
  amount: number;
  method: string;
  description: string;
  type: string;
  status: string;
  meta: any;
}) => {
  const transaction = await prisma.transaction.create({
    data: {
      clientId: data.clientId,
      sessionId: data.sessionId,
      amount: data.amount,
      status: data.status || "pending",
      type: data.type,
      method: data.method,
      description: data.description,
      meta: data.meta,
    },
  });
  return transaction;
};


export default {
  getAllTransactions,
  getTransaction,
  deleteTransaction,
  createTransaction,
};
