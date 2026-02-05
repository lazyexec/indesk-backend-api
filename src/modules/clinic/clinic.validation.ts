import Joi from "joi";

const createClinic = {
  body: Joi.object().keys({
    name: Joi.string().required().min(2).max(100),
    ownerEmail: Joi.string().email().required(),
    email: Joi.string().email().optional(),
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
  }),
};

const getClinic = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required(),
  }),
};

const updateClinic = {
  body: Joi.object().keys({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    color: Joi.string().optional(),
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
  }),
};

const updatePermissions = {
  body: Joi.object().keys({
    // Core permissions
    clinician_dashboard: Joi.boolean().optional(),
    clinician_permissions: Joi.boolean().optional(),
    clinician_ai: Joi.boolean().optional(),
    clinician_clients: Joi.boolean().optional(),
    clinician_clinicians: Joi.boolean().optional(),
    clinician_invoices: Joi.boolean().optional(),
    clinician_sessions: Joi.boolean().optional(),
    clinician_forms: Joi.boolean().optional(),
    clinician_money: Joi.boolean().optional(),
    clinician_subscription: Joi.boolean().optional(),
    clinician_integrations: Joi.boolean().optional(),
  }).min(1),
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
