import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { InvoiceStatus, Prisma } from "../../../generated/prisma/client";
import logger from "../../utils/logger";

/**
 * Create invoice
 * @param {string} clinicId
 * @param {Object} invoiceBody
 * @returns {Promise<Invoice>}
 */
const createInvoice = async (clinicId: string, invoiceBody: any) => {
  const { clientId, appointmentIds, issueDate, dueDate, totalAmount, status } =
    invoiceBody;

  // Verify client belongs to clinic
  const client = await prisma.client.findFirst({
    where: { id: clientId, clinicId },
  });
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found in this clinic");
  }

  // Verify appointments belong to client and clinic
  const appointments = await prisma.appointment.findMany({
    where: {
      id: { in: appointmentIds },
      clientId,
      clinicId,
    },
    include: {
      session: true,
    },
  });

  if (appointments.length !== appointmentIds.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "One or more appointments not found or do not belong to this client"
    );
  }

  // Check if any appointment is already invoiced or not pending
  const invalidAppointment = appointments.find(
    (appt) => appt.invoiceId || appt.status !== "pending"
  );

  if (invalidAppointment) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Appointment ${invalidAppointment.id} is already invoiced or not in pending status`
    );
  }

  // Calculate total amount if not provided
  let calculatedAmount = 0;
  if (totalAmount !== undefined) {
    calculatedAmount = totalAmount;
  } else {
    calculatedAmount = appointments.reduce(
      (sum, appt) => sum + (appt.session.price || 0),
      0
    );
  }

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      clinicId,
      clientId,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      totalAmount: calculatedAmount,
      status: status || InvoiceStatus.pending,
      appointments: {
        connect: appointmentIds.map((id: string) => ({ id })),
      },
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      appointments: {
        include: {
          session: true,
        },
      },
    },
  });

  return invoice;
};

/**
 * Query invoices
 * @param {string} clinicId
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const getInvoices = async (clinicId: string, filter: any, options: any) => {
  const {
    limit = 10,
    page = 1,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;
  const { clientName, status, ...restFilter } = filter;

  const where: any = {
    clinicId,
    ...restFilter,
  };

  if (status) {
    where.status = status;
  }

  if (clientName) {
    where.client = {
      OR: [
        { firstName: { contains: clientName, mode: "insensitive" } },
        { lastName: { contains: clientName, mode: "insensitive" } },
      ],
    };
  }

  const orderBy = { [sortBy]: sortOrder };

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [invoices, totalDocs] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        appointments: {
          select: {
            id: true,
            startTime: true,
            session: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    docs: invoices,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

/**
 * Get invoice by id
 * @param {string} clinicId
 * @param {string} invoiceId
 * @returns {Promise<Invoice>}
 */
const getInvoiceById = async (clinicId: string, invoiceId: string) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, clinicId },
    include: {
      client: true,
      appointments: {
        include: {
          session: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invoice not found");
  }

  return invoice;
};

/**
 * Update invoice
 * @param {string} clinicId
 * @param {string} invoiceId
 * @param {Object} updateBody
 * @returns {Promise<Invoice>}
 */
const updateInvoice = async (
  clinicId: string,
  invoiceId: string,
  updateBody: any
) => {
  const invoice = await getInvoiceById(clinicId, invoiceId);

  if (updateBody.appointmentIds) {
    // Verify new appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        id: { in: updateBody.appointmentIds },
        clinicId,
      },
    });
    if (appointments.length !== updateBody.appointmentIds.length) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "One or more appointments not found"
      );
    }
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      ...updateBody,
      updatedAt: undefined, // Prisma handles this
      appointmentIds: undefined, // Handle relation separately if needed, but here we used 'connect' in create.
      // For update, easier to rely on what Prisma allows.
      // If appointmentIds is passed, we might need to set them.
      appointments: updateBody.appointmentIds
        ? {
            set: updateBody.appointmentIds.map((id: string) => ({ id })),
          }
        : undefined,
    },
    include: {
      client: true,
      appointments: true,
    },
  });

  return updatedInvoice;
};

/**
 * Delete invoice
 * @param {string} clinicId
 * @param {string} invoiceId
 * @returns {Promise<Invoice>}
 */
const deleteInvoice = async (clinicId: string, invoiceId: string) => {
  const invoice = await getInvoiceById(clinicId, invoiceId);

  await prisma.invoice.delete({
    where: { id: invoiceId },
  });

  return invoice;
};

/**
 * Get invoice statistics
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
const getInvoiceStats = async (clinicId: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Monthly Sales (Paid invoices in current month)
  const monthlySales = await prisma.invoice.aggregate({
    where: {
      clinicId,
      status: InvoiceStatus.paid,
      updatedAt: {
        // Assuming 'paid' status update happens this month
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Due Amount (Pending invoices)
  const dueAmount = await prisma.invoice.aggregate({
    where: {
      clinicId,
      status: InvoiceStatus.pending,
      dueDate: {
        gte: now, // Not yet overdue
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Overdue Amount (Overdue status OR Pending + Past Due)
  const overdueAmount = await prisma.invoice.aggregate({
    where: {
      clinicId,
      OR: [
        { status: InvoiceStatus.overdue },
        {
          status: InvoiceStatus.pending,
          dueDate: {
            lt: now,
          },
        },
      ],
    },
    _sum: {
      totalAmount: true,
    },
  });

  return {
    monthlySales: monthlySales._sum.totalAmount || 0,
    dueAmount: dueAmount._sum.totalAmount || 0,
    overdueAmount: overdueAmount._sum.totalAmount || 0,
  };
};

const createSuccessInvoice = async (appointmentId: string) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        client: true,
        transaction: true,
      },
    });
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    const invoice = await prisma.invoice.create({
      data: {
        clientId: appointment.clientId,
        clinicId: appointment.clinicId,
        appointments: {
          connect: [{ id: appointmentId }],
        },
        issueDate: new Date(),
        dueDate: new Date(),
        totalAmount: appointment.transaction?.amount || 0,
        status: InvoiceStatus.paid,
      },
    });
    logger.info(`Invoice created for appointment ${appointmentId}`);
    return invoice;
  } catch (error: any) {
    logger.error(`Failed to create invoice: ${error.message}`);
    throw error;
  }
};

export default {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  createSuccessInvoice,
};
