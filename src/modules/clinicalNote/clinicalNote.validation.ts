import Joi from "joi";

const createClinicalNote = {
  body: Joi.object().keys({
    clientId: Joi.string().uuid().required(),
    note: Joi.string().required(),
  }),
};

const getClinicalNotes = {
  query: Joi.object().keys({
    clientId: Joi.string().uuid(),
    authorId: Joi.string().uuid(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getClinicalNote = {
  params: Joi.object().keys({
    clinicalNoteId: Joi.string().uuid().required(),
  }),
};

const updateClinicalNote = {
  params: Joi.object().keys({
    clinicalNoteId: Joi.string().uuid().required(),
  }),
  body: Joi.object()
    .keys({
      note: Joi.string(),
    })
    .min(1),
};

const deleteClinicalNote = {
  params: Joi.object().keys({
    clinicalNoteId: Joi.string().uuid().required(),
  }),
};

export default {
  createClinicalNote,
  getClinicalNotes,
  getClinicalNote,
  updateClinicalNote,
  deleteClinicalNote,
};
