import Joi from "joi";
import { IntegrationType } from "@prisma/client";

const connectIntegration = {
  body: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(IntegrationType))
      .required(),
    config: Joi.object().required(),
  }),
};

const disconnectIntegrationByType = {
  params: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(IntegrationType))
      .required(),
  }),
};

const updateIntegrationConfig = {
  params: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(IntegrationType))
      .required(),
  }),
  body: Joi.object().keys({
    apiKey: Joi.string().optional(),
    clientId: Joi.string().optional(),
    clientSecret: Joi.string().optional()

  }),
};

const checkIntegrationHealth = {
  params: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(IntegrationType))
      .required(),
  }),
};

const getSetupGuide = {
  params: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(IntegrationType))
      .required(),
  }),
};

const getOAuthUrl = {
  params: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(IntegrationType))
      .required(),
  }),
};

const handleOAuthCallback = {
  params: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(IntegrationType))
      .required(),
  }),
  query: Joi.object().keys({
    code: Joi.string().optional(),
    state: Joi.string().optional(),
    scope: Joi.string().optional(),
    error: Joi.string().optional(),
  }),
};

export default {
  connectIntegration,
  disconnectIntegration: disconnectIntegrationByType,
  updateIntegrationConfig,
  getOAuthUrl,
  handleOAuthCallback,
  checkIntegrationHealth,
  getSetupGuide,
};
