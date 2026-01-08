import Joi from "joi";
import validator from "../../utils/validator";

const updateProfile = {
  body: Joi.object().keys({
    firstName: Joi.string().trim().optional(),
    lastName: Joi.string().trim().optional(),
    avatar: Joi.string().optional(),
    fcmToken: Joi.string().allow(null).optional(),
    phoneNumber: Joi.number().optional(),
    countryCode: Joi.string().optional(),
  }),
};

const queryAllUsers = {
  query: Joi.object().keys({
    page: Joi.number().default(1).optional(),
    limit: Joi.number().default(10).optional(),
    sort: Joi.string().default("createdAt desc").optional(),
    role: Joi.string().valid("provider", "user").optional(),
    isDeleted: Joi.boolean().optional(),
    email: Joi.string().email().optional(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    name: Joi.string().optional(),
    phoneNumber: Joi.number().optional(),
  }),
};

const restrictUser = {
  params: Joi.object().keys({
    userId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    reason: Joi.string().required(),
  }),
};

const unrestrictUser = {
  params: Joi.object().keys({
    userId: Joi.string().uuid().required(),
  }),
};

const getUserById = {
  params: Joi.object().keys({
    userId: Joi.string().uuid().required(),
  }),
};

const addUser = {
  body: Joi.object().keys({
    avatar: Joi.string().optional(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid("provider", "user").required(),
    password: Joi.custom(validator.password).required(),
  }),
};

export default {
  updateProfile,
  queryAllUsers,
  restrictUser,
  unrestrictUser,
  getUserById,
  addUser,
};
