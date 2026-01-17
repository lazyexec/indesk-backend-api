import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { InvoiceStatus, Prisma } from "../../../generated/prisma/client";
import logger from "../../utils/logger";
import crypto from "crypto";
import env from "../../configs/env";

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

  // Generate public token
  const publicToken = crypto.randomBytes(32).toString("hex");

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      clinicId,
      clientId,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      totalAmount: calculatedAmount,
      status: status || InvoiceStatus.pending,
      publicToken,
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
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          address: true,
          logo: true,
        },
      },
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
    const publicToken = crypto.randomBytes(32).toString("hex");
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
        publicToken,
      },
    });
    logger.info(`Invoice created for appointment ${appointmentId}`);
    return invoice;
  } catch (error: any) {
    logger.error(`Failed to create invoice: ${error.message}`);
    throw error;
  }
};

/**
 * Get invoice by public token (no auth required)
 * @param {string} publicToken
 * @returns {Promise<Invoice>}
 */
const getInvoiceByPublicToken = async (publicToken: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          address: true,
          logo: true,
        },
      },
      appointments: {
        include: {
          session: {
            select: {
              name: true,
              price: true,
              duration: true,
            },
          },
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
 * Send invoice email to client
 * @param {string} clinicId
 * @param {string} invoiceId
 * @param {string} customMessage
 * @returns {Promise<void>}
 */
const sendInvoiceEmail = async (
  clinicId: string,
  invoiceId: string,
  customMessage?: string
) => {
  const invoice = await getInvoiceById(clinicId, invoiceId);

  if (!invoice.publicToken) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Invoice public token not found"
    );
  }

  // Generate public link
  const baseUrl = env.FRONTEND_URL;
  const publicLink = `${baseUrl}/invoice/public/${invoice.publicToken}`;

  // Prepare invoice details
  const clientName = `${invoice.client.firstName} ${invoice.client.lastName}`;
  const invoiceNumber = invoice.id.slice(0, 8).toUpperCase();
  const issueDate = new Date(invoice.issueDate).toLocaleDateString();
  const dueDate = new Date(invoice.dueDate).toLocaleDateString();
  const totalAmount = invoice.totalAmount.toFixed(2);

  try {
    // Use clinic's Mailchimp integration
    const mailchimpService = (await import("../integration/services/mailchimp.integration")).default;
    const isConnected = await mailchimpService.isMailchimpConnected(clinicId);

    if (!isConnected) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Mailchimp is not configured for this clinic. Please connect Mailchimp to send invoices."
      );
    }

    // Get email template
    const emailTemplates = (await import("../../configs/emailTemplates")).default;
    const template = emailTemplates.invoice(
      publicLink,
      clientName,
      invoice.clinic.name,
      invoiceNumber,
      issueDate,
      dueDate,
      totalAmount,
      customMessage
    );

    await mailchimpService.sendTransactionalEmail(clinicId, {
      to: invoice.client.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      fromName: invoice.clinic.name,
      fromEmail: invoice.clinic.email || undefined,
    });

    logger.info(`Invoice email sent via Mailchimp to ${invoice.client.email} for invoice ${invoiceId}`);
  } catch (error: any) {
    logger.error(`Failed to send invoice email: ${error.message}`);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to send invoice email: ${error.message}`
    );
  }
};

/**
 * Create payment intent for public invoice
 * @param {string} publicToken
 * @returns {Promise<Object>}
 */
const createInvoicePaymentIntent = async (publicToken: string) => {
  const invoice = await getInvoiceByPublicToken(publicToken);

  if (invoice.status === InvoiceStatus.paid) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invoice is already paid");
  }

  // Import stripe service
  const stripeService = (await import("../stripe/stripe.service")).default;

  // Create payment intent with invoice metadata
  const paymentIntent = await stripeService.createPaymentIntent({
    amount: invoice.totalAmount,
    currency: "usd",
    metadata: {
      invoiceId: invoice.id,
      clinicId: invoice.clinicId,
      clientId: invoice.clientId,
      type: "invoice_payment",
    },
  });

  logger.info(`Payment intent created for invoice ${invoice.id}: ${paymentIntent.id}`);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: invoice.totalAmount,
    invoice: {
      id: invoice.id,
      totalAmount: invoice.totalAmount,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      clinic: invoice.clinic,
    },
  };
};

/**
 * Confirm payment intent for public invoice (client-side confirmation)
 * @param {string} publicToken
 * @param {Object} paymentData
 * @returns {Promise<Object>}
 */
const confirmInvoicePayment = async (publicToken: string, paymentData: any) => {
  const invoice = await getInvoiceByPublicToken(publicToken);

  if (invoice.status === InvoiceStatus.paid) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invoice is already paid");
  }

  const { paymentIntentId } = paymentData;

  if (!paymentIntentId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment intent ID is required");
  }

  // Verify payment intent with Stripe
  const stripeService = (await import("../stripe/stripe.service")).default;
  const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payment has not been completed. Please wait for payment confirmation."
    );
  }

  // Verify payment intent matches invoice
  if (paymentIntent.metadata?.invoiceId !== invoice.id) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payment intent does not match this invoice"
    );
  }

  // Return confirmation - actual update will happen via webhook
  logger.info(`Payment confirmed for invoice ${invoice.id}, waiting for webhook`);

  return {
    message: "Payment confirmed successfully. Invoice will be updated shortly.",
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
  };
};

/**
 * Process invoice payment (called by webhook only)
 * @param {string} invoiceId
 * @returns {Promise<Invoice>}
 */
const processInvoicePayment = async (invoiceId: string, paymentIntentId: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      clinic: true,
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

  if (invoice.status === InvoiceStatus.paid) {
    logger.info(`Invoice ${invoiceId} is already paid, skipping update`);
    return invoice;
  }

  // Create transaction record
  const transactionService = (await import("../transaction/transaction.service")).default;
  await transactionService.createTransaction({
    clinicId: invoice.clinicId,
    clientId: invoice.clientId,
    transactionId: paymentIntentId,
    amount: invoice.totalAmount,
    type: "invoice_payment",
    method: "stripe",
    status: "completed",
    description: `Invoice payment for ${invoice.clinic.name}`,
    meta: {
      invoiceId: invoice.id,
      paymentIntentId,
    },
  });

  // Update invoice status
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: InvoiceStatus.paid,
    },
    include: {
      client: true,
      clinic: true,
      appointments: {
        include: {
          session: true,
        },
      },
    },
  });

  // Update associated appointments to completed
  if (invoice.appointments && invoice.appointments.length > 0) {
    await prisma.appointment.updateMany({
      where: {
        id: { in: invoice.appointments.map((appt) => appt.id) },
      },
      data: {
        status: "completed",
      },
    });
  }

  logger.info(`Invoice ${invoice.id} paid successfully via webhook with payment intent ${paymentIntentId}`);

  return updatedInvoice;
};

export default {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  createSuccessInvoice,
  getInvoiceByPublicToken,
  sendInvoiceEmail,
  createInvoicePaymentIntent,
  confirmInvoicePayment,
  processInvoicePayment,
};
