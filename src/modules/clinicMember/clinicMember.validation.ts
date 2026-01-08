import Joi from "joi";

// POST /clinics/:clinicId/members - Add clinic member
const addMember = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    role: Joi.string().valid("admin", "clinician").required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phoneNumber: Joi.number().optional(),
    countryCode: Joi.string().optional(),
    bio: Joi.string().optional(),
    availability: Joi.any().optional(),
    specilization: Joi.array().items(Joi.string()).optional(),
  }),
};

// GET /clinics/:clinicId/members - Get all clinic members
const getMembers = {
  query: Joi.object().keys({
    role: Joi.string().valid("admin", "clinician").optional(),
    limit: Joi.number().optional(),
    page: Joi.number().optional(),
    sort: Joi.string().optional(),
  }),
};

// DELETE /clinics/:clinicId/members/:memberId - Remove clinic member
const removeMember = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required(),
    memberId: Joi.string().uuid().required(),
  }),
};

export default {
  addMember,
  getMembers,
  removeMember,
};
