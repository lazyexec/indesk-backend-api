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

const disconnectIntegration = {
  body: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(IntegrationType))
      .required(),
  }),
};

const updateIntegrationSettings = {
  body: Joi.object().keys({
    type: Joi.string()
      .valid(...Object.values(IntegrationType))
      .required(),
    config: Joi.object().required(),
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
  }),
};

export default {
  connectIntegration,
  disconnectIntegration,
  updateIntegrationSettings,
  getOAuthUrl,
  handleOAuthCallback,
};
