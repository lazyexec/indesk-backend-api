import Joi from "joi";
import { IntegrationType } from "../../../generated/prisma/client";

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
    config: Joi.object().required(),
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
    code: Joi.string().required(),
    state: Joi.string().required(),
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
