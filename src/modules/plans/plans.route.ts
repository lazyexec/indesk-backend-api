import express, { Router } from "express";
import plansController from "./plans.controller";
import validate from "../../middlewares/validate";
import plansValidation from "./plans.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

/**
 * Plans Routes
 * Handles clinic purchase and plan management
 * Payment is handled via Stripe Checkout and webhook
 */

// Get available plans (public - no auth required)
router.get(
  "/available",
  plansController.getAvailablePlans
);

// Get user's purchase status (requires auth)
router.get(
  "/status",
  auth("common"),
  plansController.getPurchaseStatus
);

// Initiate clinic purchase (requires auth)
// Returns Stripe Checkout URL for frontend to redirect
router.post(
  "/initiate",
  auth("common"),
  validate(plansValidation.initiatePurchase),
  plansController.initiatePurchase
);

// Complete free clinic setup (requires auth)
router.post(
  "/complete-free",
  auth("common"),
  validate(plansValidation.completeFreePurchase),
  plansController.completeFreePurchase
);

// Cancel pending purchase (requires auth)
router.delete(
  "/cancel/:clinicId",
  auth("common"),
  validate(plansValidation.cancelPurchase),
  plansController.cancelPurchase
);

export default router;
