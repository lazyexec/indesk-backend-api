import Joi from "joi";
import validator from "../../utils/validator";

const updateProfile = {
  body: Joi.object({
    name: Joi.string().trim().optional(),
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
    role: Joi.string().optional(),
    isDeleted: Joi.boolean().optional(),
    email: Joi.string().email().optional(),
    name: Joi.string().optional(),
    phoneNumber: Joi.number().optional(),
  }),
};

const restrictUser = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
  body: Joi.object({
    reason: Joi.string().required(),
  }),
};

const unrestrictUser = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
};

const getUserById = {
  params: Joi.object().keys({
    userId: Joi.string().required(),
  }),
};

const addUser = {
  body: Joi.object({
    avatar: Joi.string().optional(),
    name: Joi.string().required(),
    email: Joi.string().required(),
    role: Joi.string().required(),
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
