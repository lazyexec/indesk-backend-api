import express, { Router } from "express";
import clinicPurchaseController from "./clinic-purchase.controller";
import validate from "../../middlewares/validate";
import clinicPurchaseValidation from "./clinic-purchase.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

/**
 * Clinic Purchase Routes
 * Handles the complete clinic purchase flow
 */

// Get available plans (public - no auth required)
router.get(
  "/plans",
  clinicPurchaseController.getAvailablePlans
);

// Get user's purchase status (requires auth)
router.get(
  "/status",
  auth("common"),
  clinicPurchaseController.getPurchaseStatus
);

// Initiate clinic purchase (requires auth)
router.post(
  "/initiate",
  auth("common"),
  validate(clinicPurchaseValidation.initiatePurchase),
  clinicPurchaseController.initiatePurchase
);

// Complete paid clinic purchase (requires auth)
router.post(
  "/complete",
  auth("common"),
  validate(clinicPurchaseValidation.completePurchase),
  clinicPurchaseController.completePurchase
);

// Complete free clinic setup (requires auth)
router.post(
  "/complete-free",
  auth("common"),
  validate(clinicPurchaseValidation.completeFreePurchase),
  clinicPurchaseController.completeFreePurchase
);

// Cancel pending purchase (requires auth)
router.delete(
  "/cancel/:clinicId",
  auth("common"),
  validate(clinicPurchaseValidation.cancelPurchase),
  clinicPurchaseController.cancelPurchase
);

export default router;