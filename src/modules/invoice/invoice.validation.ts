import Joi from "joi";
import { InvoiceStatus } from "../../../generated/prisma/client";

const createInvoice = {
  body: Joi.object().keys({
    clientId: Joi.string().required().uuid(),
    items: Joi.array().items(Joi.object().keys({
      description: Joi.string().required(),
      quantity: Joi.number().required(),
      unitPrice: Joi.number().required(),
      total: Joi.number().required()
    })).required(),
    subtotal: Joi.number().required(),
    tax: Joi.number().required(),
    total: Joi.number().required(),
    invoiceDate: Joi.date().required(),
    dueDate: Joi.date().required()
  })
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
      items: Joi.array().items(Joi.object().keys({
        description: Joi.string().required(),
        quantity: Joi.number().required(),
        unitPrice: Joi.number().required(),
        total: Joi.number().required()
      })),
      subtotal: Joi.number(),
      tax: Joi.number(),
      total: Joi.number(),
      invoiceDate: Joi.date(),
      dueDate: Joi.date(),
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
