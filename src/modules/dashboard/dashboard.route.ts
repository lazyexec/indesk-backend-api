import express, { Router } from "express";
import dashboardController from "./dashboard.controller";
import validate from "../../middlewares/validate";
import dashboardValidation from "./dashboard.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

/**
 * Dashboard Overview Routes
 * Comprehensive dashboard data for clinic management
 */

// Get comprehensive dashboard overview
router.get(
  "/overview",
  auth("clinician_dashboard"),
  validate(dashboardValidation.getDashboardOverview),
  dashboardController.getDashboardOverview
);

// Get dashboard calendar view
router.get(
  "/calendar",
  auth("clinician_dashboard"),
  validate(dashboardValidation.getDashboardCalendar),
  dashboardController.getDashboardCalendar
);

// Get clinician personal dashboard
router.get(
  "/clinician",
  auth("clinician_dashboard"),
  validate(dashboardValidation.getClinicianDashboard),
  dashboardController.getClinicianDashboard
);

// Get quick stats (for widgets)
router.get(
  "/stats",
  auth("clinician_dashboard"),
  validate(dashboardValidation.getQuickStats),
  dashboardController.getQuickStats
);

// Get dashboard for specific clinic member (admin only)
router.get(
  "/clinician/:clinicMemberId",
  auth("clinician_dashboard"),
  validate(dashboardValidation.getClinicMemberDashboard),
  dashboardController.getClinicMemberDashboard
);

export default router;