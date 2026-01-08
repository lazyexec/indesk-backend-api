import Joi from "joi";

const createClient = {
  body: Joi.object().keys({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().required(),
    dateOfBirth: Joi.date().optional(),
    gender: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    address: Joi.object()
      .keys({
        street: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        zip: Joi.string().optional(),
      })
      .optional(),
    insuranceProvider: Joi.string().optional(),
    insuranceNumber: Joi.string().optional(),
    insuranceAthorizationNumber: Joi.string().optional(),
    note: Joi.string().optional(),
    clinicId: Joi.string().uuid().required(),
  }),
};

const getClients = {
  query: Joi.object().keys({
    clinicId: Joi.string().uuid().optional(),
    addedBy: Joi.string().uuid().optional(),
    search: Joi.string().optional(),
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
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      email: Joi.string().optional(),
      dateOfBirth: Joi.date().optional(),
      gender: Joi.string().valid("male", "female", "other").optional(),
      phoneNumber: Joi.string().optional(),
      address: Joi.object()
        .keys({
          street: Joi.string().optional(),
          city: Joi.string().optional(),
          state: Joi.string().optional(),
          zip: Joi.string().optional(),
        })
        .optional(),
      note: Joi.string().optional(),
      clinicId: Joi.string().uuid().optional(),
    })
    .min(1),
};

const deleteClient = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required(),
  }),
};

export default {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
};
