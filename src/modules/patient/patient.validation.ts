import Joi from "joi";

// POST /clinics/:clinicId/patients - Create patient
const createPatient = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    firstName: Joi.string().required().min(1).max(50),
    lastName: Joi.string().required().min(1).max(50),
    email: Joi.string().email().required(),
    dateOfBirth: Joi.date().required(),
    gender: Joi.string().required(),
    phoneNumber: Joi.string().optional(),
    address: Joi.object().optional(),
    allergies: Joi.array().items(Joi.string()).optional(),
    medications: Joi.array().items(Joi.string()).optional(),
    medicalAlert: Joi.string().optional(),
  }),
};

// GET /clinics/:clinicId/patients - Get all patients
const getPatients = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required(),
  }),
  query: Joi.object().keys({
    search: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    page: Joi.number().integer().min(1).optional(),
  }),
};

// GET /clinics/:clinicId/patients/:patientId - Get single patient
const getPatient = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required(),
    patientId: Joi.string().uuid().required(),
  }),
};

export default {
  createPatient,
  getPatients,
  getPatient,
};
