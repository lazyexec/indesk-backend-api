import express from "express";
import subscriptionController from "./subscription.controller";
import { requireActiveSubscription } from "../../middlewares/featureGate";
import auth from "../../middlewares/auth";

const router = express.Router();

// Get current subscription and usage stats
router.get("/current", auth("clinician_subscription"), subscriptionController.getCurrentSubscription);

// Get all available plans
router.get("/plans", auth("clinician_subscription"), subscriptionController.getAllPlans);

// Get usage statistics
router.get("/usage", auth("clinician_subscription"), subscriptionController.getUsageStats);

// Start trial (Professional plan for 14 days)
router.post("/trial", auth("clinician_subscription"), subscriptionController.startTrial);

// Upgrade subscription
router.post("/upgrade", auth("clinician_subscription"), subscriptionController.upgradeSubscription);

// Cancel subscription
router.post("/cancel", auth("clinician_subscription"), subscriptionController.cancelSubscription);

export default router;