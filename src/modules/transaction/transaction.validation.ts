import Joi from "joi";
import validator from "../../utils/validator";

const getAllTransactions = {
  query: Joi.object().keys({
    page: Joi.number().optional(),
    limit: Joi.number().optional(),
    sort: Joi.string().default("createdAt:desc"),
  }),
};

const getTransaction = {
  params: Joi.object().keys({
    transactionId: Joi.custom(validator.objectId).required(),
  }),
};

export default {
  getAllTransactions,
  getTransaction,
};
