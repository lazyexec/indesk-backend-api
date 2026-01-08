import Joi from "joi";

const createClinic = {
  body: Joi.object()
    .keys({
      name: Joi.string().min(3).max(30).required(),
      ownerEmail: Joi.string().email().required(),
    })
    .required(),
};

const deleteClinic = {
  params: Joi.object()
    .keys({
      id: Joi.string().required(),
    })
    .required(),
};

export default {
  createClinic,
  deleteClinic,
};
