import Joi from "joi";

// POST /clinics - Create a new clinic (PROVIDER only)
const createClinic = {
  body: Joi.object().keys({
    name: Joi.string().required().min(2).max(100),
    ownerEmail: Joi.string().email(),
    email: Joi.string().email().optional(),
    phoneNumber: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional(),
    }).optional(),
  }),
};

// GET /clinics/:clinicId - Get clinic by ID
const getClinic = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required(),
  }),
};

// PUT /clinics/:clinicId - Update clinic details (clinic members)
const updateClinic = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phoneNumber: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional(),
    }).optional(),
  }),
};

// PATCH /clinics/:clinicId/permissions - Update clinic permissions (Clinic owner & admins)
const updatePermissions = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    dashboard: Joi.boolean().optional(),
    clients: Joi.boolean().optional(),
    clinicians: Joi.boolean().optional(),
    sessions: Joi.boolean().optional(),
    invoices: Joi.boolean().optional(),
    forms: Joi.boolean().optional(),
    money: Joi.boolean().optional(),
    integrations: Joi.boolean().optional(),
    ai: Joi.boolean().optional(),
  }),
};

const deleteClinic = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required(),
  }),
};

const getClinics = {
  query: Joi.object().keys({
    limit: Joi.number().optional(),
    page: Joi.number().optional(),
    sort: Joi.string().optional(),
  }),
};

export default {
  createClinic,
  getClinic,
  getClinics,
  updateClinic,
  updatePermissions,
  deleteClinic,
};
