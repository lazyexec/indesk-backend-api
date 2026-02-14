import Joi from "joi";

const createSession = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    duration: Joi.number().required(),
    description: Joi.string().optional().allow(null, ""),
    price: Joi.number().required(),
    color: Joi.string().optional().allow(null, ""),
    reminders: Joi.array()
      .items(Joi.number().integer().min(1))
      .optional()
      .default([120, 60])
      .description("Array of minutes before appointment to send reminders (default: [120, 60] = 2hr, 1hr)"),
    reminderMethod: Joi.string()
      .valid("notification", "sms", "email", "all")
      .optional()
      .default("notification"),
    enableSmsReminders: Joi.boolean().optional().default(false),
    enableEmailReminders: Joi.boolean().optional().default(false),
  }),
};

const getSessions = {
  query: Joi.object().keys({
    clinicId: Joi.string().uuid().optional(),
    limit: Joi.number().integer().optional(),
    page: Joi.number().integer().optional(),
    sort: Joi.string().optional(),
  }),
};

const getSession = {
  params: Joi.object().keys({
    sessionId: Joi.string().uuid().required(),
  }),
};

const updateSession = {
  params: Joi.object().keys({
    sessionId: Joi.string().uuid().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().optional(),
      duration: Joi.number().optional(),
      description: Joi.string().optional().allow(null, ""),
      price: Joi.number().optional(),
      color: Joi.string().optional().allow(null, ""),
      reminders: Joi.array()
        .items(Joi.number().integer().min(1))
        .optional()
        .description("Array of minutes before appointment to send reminders (default: [120, 60] = 2hr, 1hr)"),
      reminderMethod: Joi.string()
        .valid("notification", "sms", "email", "all")
        .optional(),
      enableSmsReminders: Joi.boolean().optional(),
      enableEmailReminders: Joi.boolean().optional(),
    })
    .min(1),
};

const deleteSession = {
  params: Joi.object().keys({
    sessionId: Joi.string().uuid().required(),
  }),
};

export default {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
};
