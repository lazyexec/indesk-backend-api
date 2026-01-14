import Joi from "joi";

const createAppointment = {
  body: Joi.object().keys({
    sessionId: Joi.string().uuid().required(),
    clientId: Joi.string().uuid().required(),
    clinicianId: Joi.string().uuid().required(),
    date: Joi.date().iso().required().min("now").messages({
      "date.min": "Appointment date cannot be in the past",
    }),
    time: Joi.date().iso().required(),
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
    clientPhone: Joi.number().optional(),
    clientCountryCode: Joi.string().when("clientPhone", {
      is: Joi.number(),
      then: Joi.string().required(),
      otherwise: Joi.string().optional(),
    }),
    sessionId: Joi.string().uuid().required(),
    date: Joi.date().iso().required().min("now").messages({
      "date.min": "Appointment date cannot be in the past",
    }),
    time: Joi.date().iso().required(),
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
