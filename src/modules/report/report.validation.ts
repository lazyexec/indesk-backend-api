import Joi from "joi";

const getRevenueReport = {
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  }),
};

export default {
  getRevenueReport,
};