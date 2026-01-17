import Joi from "joi";

const createClient = {
  body: Joi.object().keys({
    firstName: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "First name is required",
      "string.min": "First name must be at least 1 character",
      "string.max": "First name cannot exceed 100 characters",
      "any.required": "First name is required",
    }),
    lastName: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Last name is required",
      "string.min": "Last name must be at least 1 character",
      "string.max": "Last name cannot exceed 100 characters",
      "any.required": "Last name is required",
    }),
    email: Joi.string().trim().email().lowercase().required().messages({
      "string.empty": "Email is required",
      "string.email": "Email must be a valid email address",
      "any.required": "Email is required",
    }),
    dateOfBirth: Joi.date().max("now").optional().messages({
      "date.max": "Date of birth cannot be in the future",
    }),
    gender: Joi.string()
      .valid("male", "female", "other")
      .optional()
      .messages({
        "any.only": "Gender must be one of: male, female, other",
      }),
    phoneNumber: Joi.string()
      .trim()
      .pattern(/^[0-9+\-\s()]+$/)
      .min(7)
      .max(20)
      .optional()
      .messages({
        "string.pattern.base": "Phone number must contain only numbers and valid characters (+, -, space, parentheses)",
        "string.min": "Phone number must be at least 7 characters",
        "string.max": "Phone number cannot exceed 20 characters",
      }),
    countryCode: Joi.string()
      .trim()
      .pattern(/^\+?[0-9]{1,4}$/)
      .when("phoneNumber", {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      })
      .messages({
        "string.pattern.base": "Country code must be a valid format (e.g., +1, +44)",
        "any.required": "Country code is required when phone number is provided",
      }),
    address: Joi.object()
      .keys({
        street: Joi.string().trim().max(200).optional(),
        city: Joi.string().trim().max(100).optional(),
        state: Joi.string().trim().max(100).optional(),
        zip: Joi.string().trim().max(20).optional(),
        country: Joi.string().trim().max(100).optional(),
      })
      .optional(),
    status: Joi.string()
      .valid("active", "inactive", "pending")
      .default("active")
      .messages({
        "any.only": "Status must be one of: active, inactive, pending",
      }),
    insuranceProvider: Joi.string().trim().max(200).optional().allow("", null),
    insuranceNumber: Joi.string().trim().max(100).optional().allow("", null),
    insuranceAuthorizationNumber: Joi.string().trim().max(100).optional().allow("", null),
    assignedClinicianId: Joi.string().uuid().required().messages({
      "string.guid": "Assigned clinician ID must be a valid UUID",
    }),
    note: Joi.string().trim().max(1000).optional().allow("", null).messages({
      "string.max": "Note cannot exceed 1000 characters",
    }),
    clinicId: Joi.string().uuid().required().messages({
      "string.guid": "Clinic ID must be a valid UUID",
      "any.required": "Clinic ID is required",
    }),
  }),
};

const getClients = {
  query: Joi.object().keys({
    clinicId: Joi.string().uuid().optional(),
    addedBy: Joi.string().uuid().optional(),
    search: Joi.string().trim().optional(),
    status: Joi.string().valid("active", "inactive", "pending").optional(),
    limit: Joi.number().integer().min(1).max(100).default(10).optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    sort: Joi.string().optional(),
  }),
};

const getClient = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required().messages({
      "string.guid": "Client ID must be a valid UUID",
      "any.required": "Client ID is required",
    }),
  }),
};

const updateClient = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required().messages({
      "string.guid": "Client ID must be a valid UUID",
      "any.required": "Client ID is required",
    }),
  }),
  body: Joi.object()
    .keys({
      firstName: Joi.string().trim().min(1).max(100).optional().messages({
        "string.min": "First name must be at least 1 character",
        "string.max": "First name cannot exceed 100 characters",
      }),
      lastName: Joi.string().trim().min(1).max(100).optional().messages({
        "string.min": "Last name must be at least 1 character",
        "string.max": "Last name cannot exceed 100 characters",
      }),
      email: Joi.string().trim().email().lowercase().optional().messages({
        "string.email": "Email must be a valid email address",
      }),
      dateOfBirth: Joi.date().max("now").optional().messages({
        "date.max": "Date of birth cannot be in the future",
      }),
      gender: Joi.string()
        .valid("male", "female", "other")
        .optional()
        .messages({
          "any.only": "Gender must be one of: male, female, other",
        }),
      phoneNumber: Joi.string()
        .trim()
        .pattern(/^[0-9+\-\s()]+$/)
        .min(7)
        .max(20)
        .optional()
        .messages({
          "string.pattern.base": "Phone number must contain only numbers and valid characters",
          "string.min": "Phone number must be at least 7 characters",
          "string.max": "Phone number cannot exceed 20 characters",
        }),
      countryCode: Joi.string()
        .trim()
        .pattern(/^\+?[0-9]{1,4}$/)
        .when("phoneNumber", {
          is: Joi.exist(),
          then: Joi.required(),
          otherwise: Joi.optional(),
        })
        .messages({
          "string.pattern.base": "Country code must be a valid format",
          "any.required": "Country code is required when phone number is provided",
        }),
      address: Joi.object()
        .keys({
          street: Joi.string().trim().max(200).optional(),
          city: Joi.string().trim().max(100).optional(),
          state: Joi.string().trim().max(100).optional(),
          zip: Joi.string().trim().max(20).optional(),
          country: Joi.string().trim().max(100).optional(),
        })
        .optional(),
      status: Joi.string()
        .valid("active", "inactive", "pending")
        .optional()
        .messages({
          "any.only": "Status must be one of: active, inactive, pending",
        }),
      insuranceProvider: Joi.string().trim().max(200).optional().allow("", null),
      insuranceNumber: Joi.string().trim().max(100).optional().allow("", null),
      insuranceAuthorizationNumber: Joi.string().trim().max(100).optional().allow("", null),
      assignedClinicianId: Joi.string().uuid().optional().allow(null).messages({
        "string.guid": "Assigned clinician ID must be a valid UUID",
      }),
      note: Joi.string().trim().max(1000).optional().allow("", null).messages({
        "string.max": "Note cannot exceed 1000 characters",
      }),
    })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
    }),
};

const deleteClient = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required().messages({
      "string.guid": "Client ID must be a valid UUID",
      "any.required": "Client ID is required",
    }),
  }),
};

const updateStatus = {
  params: Joi.object().keys({
    clientId: Joi.string().uuid().required().messages({
      "string.guid": "Client ID must be a valid UUID",
      "any.required": "Client ID is required",
    }),
  }),
  body: Joi.object().keys({
    status: Joi.string()
      .valid("active", "inactive", "pending")
      .required()
      .messages({
        "any.only": "Status must be one of: active, inactive, pending",
        "any.required": "Status is required",
      }),
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
