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
    clinicPhone: Joi.string().optional().allow(null, ""),
    countryCode: Joi.when("clinicPhone", {
      is: Joi.exist().not(null, ""),
      then: Joi.string().required().pattern(/^\+\d{1,4}$/).messages({
        "string.pattern.base": "Country code must be in format +1, +44, etc.",
        "any.required": "Country code is required when phone number is provided",
      }),
      otherwise: Joi.optional().allow(null, ""),
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

const createPlan = {
  body: Joi.object().keys({
    name: Joi.string().required().trim().min(2).max(100).messages({
      "string.min": "Plan name must be at least 2 characters",
      "string.max": "Plan name cannot exceed 100 characters",
      "any.required": "Plan name is required",
    }),
    type: Joi.string()
      .valid(...Object.values(PlanType))
      .required()
      .messages({
        "any.only": "Please select a valid plan type",
        "any.required": "Plan type is required",
      }),
    description: Joi.string().optional().trim().max(500).messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
    price: Joi.number().required().min(0).messages({
      "number.min": "Price cannot be negative",
      "any.required": "Price is required",
    }),
    clinicianLimit: Joi.number().integer().required().min(0).messages({
      "number.base": "Clinician limit must be a number",
      "number.integer": "Clinician limit must be an integer",
      "number.min": "Clinician limit cannot be negative",
      "any.required": "Clinician limit is required",
    }),
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
  createPlan,
  completeFreePurchase,
  cancelPurchase,
};
