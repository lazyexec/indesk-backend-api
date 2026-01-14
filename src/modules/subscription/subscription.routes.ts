import express from "express";
import subscriptionController from "./subscription.controller";
import { requireActiveSubscription } from "../../middlewares/featureGate";
import auth from "../../middlewares/auth";

const router = express.Router();

// Get current subscription and usage stats
router.get("/current", auth(), subscriptionController.getCurrentSubscription);

// Get all available plans
router.get("/plans", subscriptionController.getAllPlans);

// Get usage statistics
router.get("/usage", auth(), subscriptionController.getUsageStats);

// Start trial (Professional plan for 14 days)
router.post("/trial", auth(), subscriptionController.startTrial);

// Upgrade subscription
router.post("/upgrade", auth(), subscriptionController.upgradeSubscription);

// Cancel subscription
router.post("/cancel", auth(), subscriptionController.cancelSubscription);

export default router;