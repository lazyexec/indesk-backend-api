import Joi from "joi";
import { PlanType } from "../../../generated/prisma/client";

const initiatePurchase = {
  body: Joi.object().keys({
    clinicName: Joi.string().required().trim().min(2).max(100).messages({
      "string.min": "Clinic name must be at least 2 characters",
      "string.max": "Clinic name cannot exceed 100 characters",
      "any.required": "Clinic name is required",
    }),
    clinicEmail: Joi.string().required().email().trim().lowercase().messages({
      "string.email": "Please provide a valid clinic email address",
      "any.required": "Clinic email is required",
    }),
    clinicPhone: Joi.number().optional().integer().positive().messages({
      "number.positive": "Phone number must be positive",
      "number.integer": "Phone number must be an integer",
    }),
    countryCode: Joi.string().when("clinicPhone", {
      is: Joi.number(),
      then: Joi.string().required().pattern(/^\+\d{1,4}$/).messages({
        "string.pattern.base": "Country code must be in format +1, +44, etc.",
        "any.required": "Country code is required when phone number is provided",
      }),
      otherwise: Joi.string().optional(),
    }),
    address: Joi.object().keys({
      street: Joi.string().required().trim().min(5).max(200).messages({
        "string.min": "Street address must be at least 5 characters",
        "string.max": "Street address cannot exceed 200 characters",
      }),
      city: Joi.string().required().trim().min(2).max(100).messages({
        "string.min": "City must be at least 2 characters",
        "string.max": "City cannot exceed 100 characters",
      }),
      state: Joi.string().required().trim().min(2).max(100).messages({
        "string.min": "State must be at least 2 characters",
        "string.max": "State cannot exceed 100 characters",
      }),
      zipCode: Joi.string().required().trim().min(3).max(20).messages({
        "string.min": "ZIP code must be at least 3 characters",
        "string.max": "ZIP code cannot exceed 20 characters",
      }),
      country: Joi.string().required().trim().min(2).max(100).messages({
        "string.min": "Country must be at least 2 characters",
        "string.max": "Country cannot exceed 100 characters",
      }),
    }).optional(),
    description: Joi.string().optional().trim().max(500).messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    planType: Joi.string()
      .valid(...Object.values(PlanType))
      .required()
      .messages({
        "any.only": "Please select a valid plan type",
        "any.required": "Plan type is required",
      }),
    startTrial: Joi.boolean().optional().default(false),
  }),
};

const completePurchase = {
  body: Joi.object().keys({
    paymentIntentId: Joi.string().required().messages({
      "any.required": "Payment intent ID is required",
      "string.empty": "Payment intent ID cannot be empty",
    }),
  }),
};

const completeFreePurchase = {
  body: Joi.object().keys({
    clinicId: Joi.string().uuid().required().messages({
      "string.uuid": "Clinic ID must be a valid UUID",
      "any.required": "Clinic ID is required",
    }),
    planId: Joi.string().uuid().required().messages({
      "string.uuid": "Plan ID must be a valid UUID",
      "any.required": "Plan ID is required",
    }),
  }),
};

const cancelPurchase = {
  params: Joi.object().keys({
    clinicId: Joi.string().uuid().required().messages({
      "string.uuid": "Clinic ID must be a valid UUID",
      "any.required": "Clinic ID is required",
    }),
  }),
};

export default {
  initiatePurchase,
  completePurchase,
  completeFreePurchase,
  cancelPurchase,
};