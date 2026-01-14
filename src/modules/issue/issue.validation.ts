import Joi from "joi";
import { IssueType, IssuePriority, IssueStatus } from "../../../generated/prisma/client";

const createIssue = {
  body: Joi.object().keys({
    title: Joi.string().required().min(5).max(200),
    description: Joi.string().required().min(10).max(2000),
    type: Joi.string().valid(...Object.values(IssueType)).required(),
    priority: Joi.string().valid(...Object.values(IssuePriority)).optional(),
    clinicId: Joi.string().uuid().optional(),
    browserInfo: Joi.string().max(500).optional(),
    url: Joi.string().uri().optional(),
    steps: Joi.string().max(1000).optional(),
    expectedResult: Joi.string().max(500).optional(),
    actualResult: Joi.string().max(500).optional(),
    attachments: Joi.array().items(Joi.string().uri()).max(5).optional()
  })
};

const getIssues = {
  query: Joi.object().keys({
    status: Joi.string().valid(...Object.values(IssueStatus)).optional(),
    type: Joi.string().valid(...Object.values(IssueType)).optional(),
    priority: Joi.string().valid(...Object.values(IssuePriority)).optional(),
    clinicId: Joi.string().uuid().optional(),
    search: Joi.string().max(100).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

const getIssue = {
  params: Joi.object().keys({
    id: Joi.string().uuid().required()
  })
};

const updateIssue = {
  params: Joi.object().keys({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object().keys({
    title: Joi.string().min(5).max(200).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    type: Joi.string().valid(...Object.values(IssueType)).optional(),
    priority: Joi.string().valid(...Object.values(IssuePriority)).optional(),
    status: Joi.string().valid(...Object.values(IssueStatus)).optional(),
    adminResponse: Joi.string().max(1000).optional()
  }).min(1)
};

const deleteIssue = {
  params: Joi.object().keys({
    id: Joi.string().uuid().required()
  })
};

export default {
  createIssue,
  getIssues,
  getIssue,
  updateIssue,
  deleteIssue
};