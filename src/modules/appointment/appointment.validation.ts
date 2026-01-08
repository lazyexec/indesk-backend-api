import Joi from "joi";

const createAppointment = {
  body: Joi.object().keys({
    sessionId: Joi.string().uuid().required(),
    clientEmail: Joi.string().email().required(),
    clinicianId: Joi.string().uuid().required(),
    date: Joi.date().required(),
    time: Joi.date().required(),
    note: Joi.string().optional().allow(null, ""),
    meetingType: Joi.string().valid("in_person", "zoom").optional(),
  }),
};

const getClientAppointments = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required(),
  }),
};

export default {
  createAppointment,
  getClientAppointments,
};
