import Joi from "joi";

const getDashboardOverview = {
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional().when('startDate', {
      is: Joi.exist(),
      then: Joi.date().iso().min(Joi.ref('startDate')).required(),
      otherwise: Joi.date().iso().optional()
    }),
  }),
};

const getDashboardCalendar = {
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional().when('startDate', {
      is: Joi.exist(),
      then: Joi.date().iso().min(Joi.ref('startDate')).required(),
      otherwise: Joi.date().iso().optional()
    }),
    view: Joi.string().valid('month', 'week', 'day').optional().default('month'),
  }),
};

const getClinicianDashboard = {
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional().when('startDate', {
      is: Joi.exist(),
      then: Joi.date().iso().min(Joi.ref('startDate')).required(),
      otherwise: Joi.date().iso().optional()
    }),
  }),
};

const getClinicMemberDashboard = {
  params: Joi.object().keys({
    clinicMemberId: Joi.string().uuid().required(),
  }),
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional().when('startDate', {
      is: Joi.exist(),
      then: Joi.date().iso().min(Joi.ref('startDate')).required(),
      otherwise: Joi.date().iso().optional()
    }),
  }),
};

const getQuickStats = {
  // No validation needed for quick stats
};

export default {
  getDashboardOverview,
  getDashboardCalendar,
  getClinicianDashboard,
  getClinicMemberDashboard,
  getQuickStats,
};