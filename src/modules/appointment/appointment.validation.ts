import Joi from "joi";

const createAppointment = {
  body: Joi.object().keys({
    sessionId: Joi.string().uuid().required(),
    clientId: Joi.string().uuid().required(),
    clinicianId: Joi.string().uuid().required(),
    date: Joi.date().iso().optional(), // Made optional
    time: Joi.date().iso().required().min("now").messages({
      "date.min": "Appointment time cannot be in the past",
    }),
    note: Joi.string().optional().allow(null, "").max(500),
    meetingType: Joi.string()
      .valid("in_person", "zoom")
      .optional()
      .default("zoom"),
  }),
};

const applyAppointmentWithToken = {
  params: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    clientFirstName: Joi.string().required().trim().min(2).max(50).messages({
      "string.min": "First name must be at least 2 characters",
      "string.max": "First name cannot exceed 50 characters",
    }),
    clientLastName: Joi.string().required().trim().min(2).max(50).messages({
      "string.min": "Last name must be at least 2 characters",
      "string.max": "Last name cannot exceed 50 characters",
    }),
    clientEmail: Joi.string().required().email().trim().lowercase().messages({
      "string.email": "Please provide a valid email address",
    }),
    clientPhone: Joi.string()
      .trim()
      .pattern(/^[0-9+\-\s()]+$/)
      .min(7)
      .max(20)
      .optional()
      .messages({
        "string.pattern.base": "Phone number must contain only numbers and valid characters (+, -, space, parentheses)",
        "string.min": "Phone number must be at least 7 characters",
        "string.max": "Phone number cannot exceed 20 characters",
      }),
    clientCountryCode: Joi.string()
      .trim()
      .pattern(/^\+?[0-9]{1,4}$/)
      .when("clientPhone", {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.optional(),
      })
      .messages({
        "string.pattern.base": "Country code must be a valid format (e.g., +1, +44)",
        "any.required": "Country code is required when phone number is provided",
      }),
    sessionId: Joi.string().uuid().required(),
    time: Joi.date().iso().required().min("now").messages({
      "date.min": "Appointment date cannot be in the past",
    }),
    note: Joi.string().optional().allow(null, "").max(500),
    meetingType: Joi.string()
      .valid("in_person", "zoom")
      .optional()
      .default("zoom"),
  }),
};

const getClientAppointments = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required(),
  }),
};

const getAppointmentByToken = {
  params: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const createPaymentSession = {
  body: Joi.object().keys({
    appointmentId: Joi.string().uuid().required(),
    token: Joi.string().required(),
  }),
};

const getAppointmentById = {
  params: Joi.object().keys({
    appointmentId: Joi.string().uuid().required(),
  }),
};

const getAppointmentSessionByToken = {
  params: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const getAppointmentsByClinicMemberId = {
  params: Joi.object().keys({
    clinicMemberId: Joi.string().uuid().required(),
  }),
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    status: Joi.string().valid("pending", "completed", "cancelled", "scheduled").optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sort: Joi.object().optional(),
  }),
};

const getCalendarAppointments = {
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    status: Joi.string().valid("pending", "completed", "cancelled", "scheduled").optional(),
    view: Joi.string().valid("month", "week", "day").optional().default("month"),
  }),
};

const getCalendarStats = {
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }),
};

export default {
  createAppointment,
  applyAppointmentWithToken,
  getClientAppointments,
  getAppointmentByToken,
  createPaymentSession,
  getAppointmentById,
  getAppointmentSessionByToken,
  getAppointmentsByClinicMemberId,
  getCalendarAppointments,
  getCalendarStats,
};
