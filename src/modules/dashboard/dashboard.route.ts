import express, { Router } from "express";
import dashboardController from "./dashboard.controller";
import validate from "../../middlewares/validate";
import dashboardValidation from "./dashboard.validation";
import { authWithActiveSubscription } from "../../middlewares/authWithSubscription";

const router: Router = express.Router();

/**
 * Dashboard Overview Routes
 * Comprehensive dashboard data for clinic management
 */

// Get comprehensive dashboard overview
router.get(
  "/overview",
  authWithActiveSubscription("dashboard_access"),
  validate(dashboardValidation.getDashboardOverview),
  dashboardController.getDashboardOverview
);

// Get dashboard calendar view
router.get(
  "/calendar",
  authWithActiveSubscription("dashboard_access"),
  validate(dashboardValidation.getDashboardCalendar),
  dashboardController.getDashboardCalendar
);

// Get clinician personal dashboard
router.get(
  "/clinician",
  authWithActiveSubscription("dashboard_access"),
  validate(dashboardValidation.getClinicianDashboard),
  dashboardController.getClinicianDashboard
);

// Get quick stats (for widgets)
router.get(
  "/stats",
  authWithActiveSubscription("dashboard_access"),
  validate(dashboardValidation.getQuickStats),
  dashboardController.getQuickStats
);

// Get dashboard for specific clinic member (admin only)
router.get(
  "/clinician/:clinicMemberId",
  authWithActiveSubscription("dashboard_access"),
  validate(dashboardValidation.getClinicMemberDashboard),
  dashboardController.getClinicMemberDashboard
);

export default router;