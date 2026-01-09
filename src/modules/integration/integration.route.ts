import express, { Router } from "express";
import integrationController from "./integration.controller";
import validate from "../../middlewares/validate";
import integrationValidation from "./integration.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

// Get all integrations
router.get(
  "/",
  auth("commonAdmin", "clinician_integrations"),
  integrationController.getIntegrations
);

// Connect integration
router.post(
  "/connect",
  auth("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.connectIntegration),
  integrationController.connectIntegration
);

// Disconnect integration
router.post(
  "/disconnect",
  auth("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.disconnectIntegration),
  integrationController.disconnectIntegration
);

// Update integration settings
router.put(
  "/settings",
  auth("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.updateIntegrationSettings),
  integrationController.updateIntegrationSettings
);

// Get OAuth URL for integration
router.get(
  "/oauth/:type",
  auth("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.getOAuthUrl),
  integrationController.getOAuthUrl
);

// OAuth callback (no auth required - handled by OAuth provider)
router.get(
  "/oauth/callback/:type",
  validate(integrationValidation.handleOAuthCallback),
  integrationController.handleOAuthCallback
);

export default router;
