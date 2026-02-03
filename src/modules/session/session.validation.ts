import Joi from "joi";

const createSession = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    duration: Joi.number().required(),
    description: Joi.string().optional().allow(null, ""),
    price: Joi.number().required(),
    color: Joi.string().optional().allow(null, ""),
    reminders: Joi.object()
      .keys({
        whatsapp: Joi.boolean().optional().default(false),
        email: Joi.boolean().optional().default(false),
      })
      .optional(),
  }),
};

const getSessions = {
  query: Joi.object().keys({
    clinicId: Joi.string().uuid().optional(),
    limit: Joi.number().integer().optional(),
    page: Joi.number().integer().optional(),
    sort: Joi.string().optional(),
  }),
};

const getSession = {
  params: Joi.object().keys({
    sessionId: Joi.string().uuid().required(),
  }),
};

const updateSession = {
  params: Joi.object().keys({
    sessionId: Joi.string().uuid().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().optional(),
      duration: Joi.number().optional(),
      description: Joi.string().optional().allow(null, ""),
      price: Joi.number().optional(),
      color: Joi.string().optional().allow(null, ""),
      reminders: Joi.object()
        .keys({
          whatsapp: Joi.boolean().optional().default(false),
          email: Joi.boolean().optional().default(false),
        })
        .optional(),
    })
    .min(1),
};

const deleteSession = {
  params: Joi.object().keys({
    sessionId: Joi.string().uuid().required(),
  }),
};

export default {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
};
