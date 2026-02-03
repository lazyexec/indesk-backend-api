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
  const { clientId, items, subtotal, tax, total, invoiceDate, dueDate } =
    invoiceBody;

  // Verify client belongs to clinic
  const client = await prisma.client.findFirst({
    where: { id: clientId, clinicId },
  });
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found in this clinic");
  }

  // Validate items calculations
  const calculatedSubtotal = items.reduce(
    (sum: number, item: any) => sum + item.total,
    0,
  );
  if (Math.abs(calculatedSubtotal - subtotal) > 0.01) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Subtotal does not match items total",
    );
  }

  const calculatedTotal = subtotal + tax;
  if (Math.abs(calculatedTotal - total) > 0.01) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Total does not match subtotal + tax",
    );
  }

  // Validate individual item calculations
  for (const item of items) {
    const expectedTotal = item.quantity * item.unitPrice;
    if (Math.abs(expectedTotal - item.total) > 0.01) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Item "${item.description}" total does not match quantity × unit price`,
      );
    }
  }

  // Generate public token
  const publicToken = crypto.randomBytes(32).toString("hex");

  // Create invoice with new structure
  const invoice = await prisma.invoice.create({
    data: {
      clinicId,
      clientId,
      items: items, // Store as JSON
      subtotal,
      tax,
      totalAmount: total,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      status: InvoiceStatus.pending,
      publicToken,
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
  updateBody: any,
) => {
  const invoice = await getInvoiceById(clinicId, invoiceId);

  // Validate items calculations if items are being updated
  if (updateBody.items && updateBody.subtotal !== undefined) {
    const calculatedSubtotal = updateBody.items.reduce(
      (sum: number, item: any) => sum + item.total,
      0,
    );
    if (Math.abs(calculatedSubtotal - updateBody.subtotal) > 0.01) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Subtotal does not match items total",
      );
    }

    // Validate individual item calculations
    for (const item of updateBody.items) {
      const expectedTotal = item.quantity * item.unitPrice;
      if (Math.abs(expectedTotal - item.total) > 0.01) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Item "${item.description}" total does not match quantity × unit price`,
        );
      }
    }
  }

  // Validate total calculation if all components are provided
  if (
    updateBody.subtotal !== undefined &&
    updateBody.tax !== undefined &&
    updateBody.total !== undefined
  ) {
    const calculatedTotal = updateBody.subtotal + updateBody.tax;
    if (Math.abs(calculatedTotal - updateBody.total) > 0.01) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Total does not match subtotal + tax",
      );
    }
  }

  // Prepare update data
  const updateData: any = { ...updateBody };

  // Handle date field conversion
  if (updateBody.invoiceDate) {
    updateData.invoiceDate = new Date(updateBody.invoiceDate);
  }
  if (updateBody.dueDate) {
    updateData.dueDate = new Date(updateBody.dueDate);
  }

  // Update totalAmount if total is provided
  if (updateBody.total !== undefined) {
    updateData.totalAmount = updateBody.total;
    delete updateData.total; // Remove the 'total' field as it's stored as 'totalAmount'
  }

  // Remove fields that shouldn't be directly updated
  delete updateData.updatedAt; // Prisma handles this

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: updateData,
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
  now.setHours(0, 0, 0, 0); // Normalize to start of day

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Monthly Sales (Paid invoices in current month)
  const monthlySales = await prisma.invoice.aggregate({
    where: {
      clinicId,
      status: InvoiceStatus.paid,
      updatedAt: {
        gte: startOfMonth,
        lt: startOfNextMonth,
      },
    },
    _sum: {
      totalAmount: true,
    },
    _count: {
      id: true,
    },
  });

  // Due Amount (Pending invoices not yet overdue)
  const dueAmount = await prisma.invoice.aggregate({
    where: {
      clinicId,
      status: InvoiceStatus.pending,
      dueDate: {
        gte: now,
      },
    },
    _sum: {
      totalAmount: true,
    },
    _count: {
      id: true,
    },
  });

  // Overdue Amount
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
    _count: {
      id: true,
    },
  });

  return {
    monthlySales: {
      amount: monthlySales._sum.totalAmount || 0,
      count: monthlySales._count.id || 0,
    },
    dueAmount: {
      amount: dueAmount._sum.totalAmount || 0,
      count: dueAmount._count.id || 0,
    },
    overdueAmount: {
      amount: overdueAmount._sum.totalAmount || 0,
      count: overdueAmount._count.id || 0,
    },
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
        session: true,
      },
    });
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    const publicToken = crypto.randomBytes(32).toString("hex");

    // Create a default item for the appointment
    const items = [
      {
        description: appointment.session?.name || "Service",
        quantity: 1,
        unitPrice: appointment.transaction?.amount || 0,
        total: appointment.transaction?.amount || 0,
      },
    ];

    const invoice = await prisma.invoice.create({
      data: {
        clientId: appointment.clientId,
        clinicId: appointment.clinicId,
        items: items,
        subtotal: appointment.transaction?.amount || 0,
        tax: 0,
        totalAmount: appointment.transaction?.amount || 0,
        invoiceDate: new Date(),
        dueDate: new Date(),
        status: InvoiceStatus.paid,
        publicToken,
        appointments: {
          connect: [{ id: appointmentId }],
        },
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
  customMessage?: string,
) => {
  const invoice = await getInvoiceById(clinicId, invoiceId);

  if (!invoice.publicToken) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Invoice public token not found",
    );
  }

  // Generate public link
  const baseUrl = env.FRONTEND_URL;
  const publicLink = `${baseUrl}/invoice/public/${invoice.publicToken}`;

  // Prepare invoice details
  const clientName = `${invoice.client.firstName} ${invoice.client.lastName}`;
  const invoiceNumber = invoice.id.slice(0, 8).toUpperCase();
  const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString();
  const dueDate = new Date(invoice.dueDate).toLocaleDateString();
  const totalAmount = invoice.totalAmount.toFixed(2);

  try {
    // Use clinic's Mailchimp integration
    const mailchimpService = (
      await import("../integration/services/mailchimp.integration")
    ).default;
    const isConnected = await mailchimpService.isMailchimpConnected(clinicId);

    if (!isConnected) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Mailchimp is not configured for this clinic. Please connect Mailchimp to send invoices.",
      );
    }

    // Get email template
    const emailTemplates = (await import("../../configs/emailTemplates"))
      .default;
    const template = emailTemplates.invoice(
      publicLink,
      clientName,
      invoice.clinic.name,
      invoiceNumber,
      invoiceDate,
      dueDate,
      totalAmount,
      customMessage,
    );

    await mailchimpService.sendTransactionalEmail(clinicId, {
      to: invoice.client.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      fromName: invoice.clinic.name,
      fromEmail: invoice.clinic.email || undefined,
    });

    logger.info(
      `Invoice email sent via Mailchimp to ${invoice.client.email} for invoice ${invoiceId}`,
    );
  } catch (error: any) {
    logger.error(`Failed to send invoice email: ${error.message}`);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to send invoice email: ${error.message}`,
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

  logger.info(
    `Payment intent created for invoice ${invoice.id}: ${paymentIntent.id}`,
  );

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: invoice.totalAmount,
    invoice: {
      id: invoice.id,
      totalAmount: invoice.totalAmount,
      invoiceDate: invoice.invoiceDate,
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
  const paymentIntent =
    await stripeService.retrievePaymentIntent(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payment has not been completed. Please wait for payment confirmation.",
    );
  }

  // Verify payment intent matches invoice
  if (paymentIntent.metadata?.invoiceId !== invoice.id) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payment intent does not match this invoice",
    );
  }

  // Return confirmation - actual update will happen via webhook
  logger.info(
    `Payment confirmed for invoice ${invoice.id}, waiting for webhook`,
  );

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
const processInvoicePayment = async (
  invoiceId: string,
  paymentIntentId: string,
) => {
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
  const transactionService = (
    await import("../transaction/transaction.service")
  ).default;
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

  logger.info(
    `Invoice ${invoice.id} paid successfully via webhook with payment intent ${paymentIntentId}`,
  );

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
