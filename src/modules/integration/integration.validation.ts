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

export default {
  connectIntegration,
  disconnectIntegration,
};
