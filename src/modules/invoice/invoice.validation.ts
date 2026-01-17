import Joi from "joi";
import { InvoiceStatus } from "../../../generated/prisma/client";

const createInvoice = {
  body: Joi.object().keys({
    clientId: Joi.string().required().uuid(),
    appointmentIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
    issueDate: Joi.date().required(),
    dueDate: Joi.date().required().greater(Joi.ref("issueDate")),
    // totalAmount can be optionally passed, otherwise calculated from appointments
    totalAmount: Joi.number().min(0),
    status: Joi.string()
      .valid(...Object.values(InvoiceStatus))
      .default(InvoiceStatus.pending),
  }),
};

const getInvoices = {
  query: Joi.object().keys({
    clientName: Joi.string(),
    status: Joi.string().valid(...Object.values(InvoiceStatus)),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getInvoice = {
  params: Joi.object().keys({
    invoiceId: Joi.string().uuid().required(),
  }),
};

const updateInvoice = {
  params: Joi.object().keys({
    invoiceId: Joi.string().uuid().required(),
  }),
  body: Joi.object()
    .keys({
      clientId: Joi.string().uuid(),
      appointmentIds: Joi.array().items(Joi.string().uuid()).min(1),
      issueDate: Joi.date(),
      dueDate: Joi.date().greater(Joi.ref("issueDate")),
      totalAmount: Joi.number().min(0),
      status: Joi.string().valid(...Object.values(InvoiceStatus)),
    })
    .min(1),
};

const deleteInvoice = {
  params: Joi.object().keys({
    invoiceId: Joi.string().uuid().required(),
  }),
};

const sendInvoiceEmail = {
  params: Joi.object().keys({
    invoiceId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    customMessage: Joi.string().optional(),
  }),
};

const getPublicInvoice = {
  params: Joi.object().keys({
    publicToken: Joi.string().required(),
  }),
};

const confirmInvoicePayment = {
  params: Joi.object().keys({
    publicToken: Joi.string().required(),
  }),
  body: Joi.object().keys({
    paymentIntentId: Joi.string().required().messages({
      "any.required": "Payment intent ID is required",
      "string.empty": "Payment intent ID cannot be empty",
    }),
  }),
};

export default {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoiceEmail,
  getPublicInvoice,
  confirmInvoicePayment,
};
