import express from "express";
import reportController from "./report.controller";
import validate from "../../middlewares/validate";
import reportValidation from "./report.validation";
import auth from "../../middlewares/auth";

const router = express.Router();

// Admin-only routes - require admin or superAdmin permissions
router.get(
  "/dashboard",
  auth("admin", "superAdmin"),
  reportController.getDashboardSummary
);

router.get(
  "/subscriptions",
  auth("admin", "superAdmin"),
  reportController.getSubscriptionOverview
);

router.get(
  "/client-usage",
  auth("admin", "superAdmin"),
  reportController.getClientUsageReport
);

router.get(
  "/trials",
  auth("admin", "superAdmin"),
  reportController.getTrialReport
);

router.get(
  "/revenue",
  auth("admin", "superAdmin"),
  validate(reportValidation.getRevenueReport),
  reportController.getRevenueReport
);

router.get(
  "/system-health",
  auth("admin", "superAdmin"),
  reportController.getSystemHealthReport
);

export default router;