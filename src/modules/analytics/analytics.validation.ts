import Joi from "joi";

const getAnalytics = {
  query: Joi.object().keys({
    months: Joi.number().integer().min(1).max(24).optional(),
  }),
};

const exportReport = {
  query: Joi.object().keys({
    months: Joi.number().integer().min(1).max(24).optional(),
    format: Joi.string().valid('json', 'csv').optional(),
  }),
};

export default {
  getAnalytics,
  exportReport,
};