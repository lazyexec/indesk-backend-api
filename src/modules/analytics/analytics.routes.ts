import express from "express";
import analyticsController from "./analytics.controller";
import validate from "../../middlewares/validate";
import analyticsValidation from "./analytics.validation";
import auth from "../../middlewares/auth";

const router = express.Router();

// Financial overview - providers see all clinics, clinic users see their clinic only
router.get(
  "/financial-overview",
  auth("provider", "clinician_money", "commonAdmin"),
  validate(analyticsValidation.getAnalytics),
  analyticsController.getFinancialOverview
);

// Income sources breakdown - providers see all clinics, clinic users see their clinic only
router.get(
  "/income-sources",
  auth("provider", "clinician_money", "commonAdmin"),
  validate(analyticsValidation.getAnalytics),
  analyticsController.getIncomeSourcesBreakdown
);

// Session type distribution - providers see all clinics, clinic users see their clinic only
router.get(
  "/session-distribution",
  auth("provider", "clinician_money", "commonAdmin"),
  validate(analyticsValidation.getAnalytics),
  analyticsController.getSessionTypeDistribution
);

// Client growth analysis - providers see all clinics, clinic users see their clinic only
router.get(
  "/client-growth",
  auth("provider", "clinician_money", "commonAdmin"),
  validate(analyticsValidation.getAnalytics),
  analyticsController.getClientGrowthAnalysis
);

// Expenses analysis - providers see subscription revenue, clinic users see their expenses
router.get(
  "/expenses",
  auth("provider", "clinician_money", "commonAdmin"),
  validate(analyticsValidation.getAnalytics),
  analyticsController.getExpensesAnalysis
);

// Comprehensive analytics dashboard
router.get(
  "/dashboard",
  auth("provider", "clinician_money", "commonAdmin"),
  validate(analyticsValidation.getAnalytics),
  analyticsController.getComprehensiveAnalytics
);

// Export report
router.get(
  "/export",
  auth("provider", "clinician_money", "commonAdmin"),
  validate(analyticsValidation.exportReport),
  analyticsController.exportReport
);

export default router;