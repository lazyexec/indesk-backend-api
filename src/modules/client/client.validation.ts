import Joi from "joi";

const createClient = {
  body: Joi.object().keys({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().required(),
    dateOfBirth: Joi.date().optional(),
    gender: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    countryCode: Joi.string().when("phoneNumber", {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    address: Joi.object()
      .keys({
        street: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        zip: Joi.string().optional(),
      })
      .optional(),
    status: Joi.string()
      .optional()
      .allow("active", "inactive", "pending")
      .default("active"),
    insuranceProvider: Joi.string().optional(),
    insuranceNumber: Joi.string().optional(),
    insuranceAuthorizationNumber: Joi.string().optional(),
    assignedClinicianId: Joi.string().uuid().optional(),
    note: Joi.string().optional(),
    clinicId: Joi.string().uuid().required(),
  }),
};

const getClients = {
  query: Joi.object().keys({
    clinicId: Joi.string().uuid().optional(),
    addedBy: Joi.string().uuid().optional(),
    search: Joi.string().optional(),
    status: Joi.string().optional().allow("active", "inactive", "pending"),
    limit: Joi.number().integer().optional(),
    page: Joi.number().integer().optional(),
    sort: Joi.string().optional(),
  }),
};

const getClient = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required(),
  }),
};

const updateClient = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required(),
  }),
  body: Joi.object()
    .keys({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().required(),
      dateOfBirth: Joi.date().optional(),
      gender: Joi.string().optional(),
      phoneNumber: Joi.string().optional(),
      countryCode: Joi.string().when("phoneNumber", {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
      address: Joi.object()
        .keys({
          street: Joi.string().optional(),
          city: Joi.string().optional(),
          state: Joi.string().optional(),
          zip: Joi.string().optional(),
        })
        .optional(),
      status: Joi.string()
        .optional()
        .allow("active", "inactive", "pending")
        .default("active"),
      insuranceProvider: Joi.string().optional(),
      insuranceNumber: Joi.string().optional(),
      insuranceAuthorizationNumber: Joi.string().optional(),
      assignedClinicianId: Joi.string().uuid().optional(),
      note: Joi.string().optional(),
    })
    .min(1),
};

const deleteClient = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required(),
  }),
};

const updateStatus = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().required().allow("active", "inactive", "pending"),
  }),
};

export default {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  updateStatus,
};
