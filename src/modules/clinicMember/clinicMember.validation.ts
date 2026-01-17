import Joi from "joi";

// POST /clinics/:clinicId/members - Add clinic member
const addMember = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    role: Joi.string().valid("admin", "clinician").required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    countryCode: Joi.string().when("phoneNumber", {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    bio: Joi.string().optional(),
    availability: Joi.any().optional(),
    specialization: Joi.array().items(Joi.string()).optional(),
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
    memberId: Joi.string().uuid().required(),
  }),
};

// PATCH /clinics/:clinicId/members/:memberId - Update clinic member
const updateMember = {
  params: Joi.object().keys({
    memberId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    availability: Joi.any().optional(),
    specialization: Joi.array().items(Joi.string()).optional(),
  }),
};

// PATCH /clinics/:clinicId/members/:memberId/role - Update member role (admin only)
const updateMemberRole = {
  params: Joi.object().keys({
    memberId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    role: Joi.string().valid("admin", "clinician").required(),
  }),
};

export default {
  addMember,
  getMembers,
  removeMember,
  updateMember,
  updateMemberRole,
};
