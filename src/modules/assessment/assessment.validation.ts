import Joi from "joi";

const assessmentQuestion = Joi.object().keys({
  question: Joi.string().required(),
  type: Joi.string().valid("text", "multiple_choice", "yes_no").required(),
  options: Joi.array().items(Joi.string()).when("type", {
    is: "multiple_choice",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  correctAnswer: Joi.string().when("type", {
    is: Joi.valid("multiple_choice", "yes_no"),
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),
  points: Joi.number().integer().min(0).optional().default(1),
  order: Joi.number().integer().min(0).optional(),
});

const createAssessmentTemplate = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    category: Joi.string()
      .valid("general_clinical", "mental_health", "physical_therapy", "neurology")
      .optional()
      .default("general_clinical"),
    questions: Joi.array().items(assessmentQuestion).min(1).required(),
  }),
};

const getAssessmentTemplates = {
  query: Joi.object().keys({
    category: Joi.string()
      .valid("general_clinical", "mental_health", "physical_therapy", "neurology")
      .optional(),
    limit: Joi.number().integer().optional(),
    page: Joi.number().integer().optional(),
    sort: Joi.string().optional(),
  }),
};

const getAssessmentTemplate = {
  params: Joi.object().keys({
    templateId: Joi.string().uuid().required(),
  }),
};

const updateAssessmentTemplate = {
  params: Joi.object().keys({
    templateId: Joi.string().uuid().required(),
  }),
  body: Joi.object()
    .keys({
      title: Joi.string().optional(),
      description: Joi.string().optional(),
      category: Joi.string()
        .valid("general_clinical", "mental_health", "physical_therapy", "neurology")
        .optional(),
      isActive: Joi.boolean().optional(),
      questions: Joi.array().items(assessmentQuestion).optional(),
    })
    .min(1),
};

const deleteAssessmentTemplate = {
  params: Joi.object().keys({
    templateId: Joi.string().uuid().required(),
  }),
};

const createAssessmentInstance = {
  body: Joi.object().keys({
    templateId: Joi.string().uuid().required(),
    clientId: Joi.string().uuid().required(),
    clinicianId: Joi.string().uuid().optional(),
    documentUrl: Joi.string().uri().optional(), // For direct URL
    note: Joi.string().max(1000).optional(),
  }),
};

const shareAssessmentViaEmail = {
  params: Joi.object().keys({
    instanceId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    message: Joi.string().optional(),
  }),
};

const getAssessmentByToken = {
  params: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const submitAssessment = {
  params: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    responses: Joi.array()
      .items(
        Joi.object().keys({
          questionId: Joi.string().uuid().required(),
          answer: Joi.string().required(),
        }),
      )
      .min(1)
      .required(),
    submittedByClinician: Joi.boolean().optional().default(false),
    clinicianId: Joi.string().uuid().when("submittedByClinician", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
};

const getAssessmentInstances = {
  query: Joi.object().keys({
    clientId: Joi.string().uuid().optional(),
    status: Joi.string()
      .valid("pending", "in_progress", "completed")
      .optional(),
    limit: Joi.number().integer().optional(),
    page: Joi.number().integer().optional(),
    sort: Joi.string().optional(),
  }),
};

const getAssessmentInstance = {
  params: Joi.object().keys({
    instanceId: Joi.string().uuid().required(),
  }),
};

const createAssessmentAi = {
  body: Joi.object().keys({
    topic: Joi.string().required().min(3).max(200),
  }),
};

const submitAssessmentByClinician = {
  params: Joi.object().keys({
    instanceId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    responses: Joi.array()
      .items(
        Joi.object().keys({
          questionId: Joi.string().uuid().required(),
          answer: Joi.string().required(),
        }),
      )
      .min(1)
      .required(),
  }),
};

export default {
  createAssessmentTemplate,
  getAssessmentTemplates,
  getAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate,
  createAssessmentInstance,
  shareAssessmentViaEmail,
  getAssessmentByToken,
  submitAssessment,
  getAssessmentInstances,
  getAssessmentInstance,
  createAssessmentAi,
  submitAssessmentByClinician,
};
