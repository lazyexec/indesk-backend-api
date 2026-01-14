import express, { Router } from "express";
import integrationController from "./integration.controller";
import validate from "../../middlewares/validate";
import integrationValidation from "./integration.validation";
import { authWithIntegrations } from "../../middlewares/authWithSubscription";

const router: Router = express.Router();

// Get all integrations
router.get(
  "/",
  authWithIntegrations("commonAdmin", "clinician_integrations"),
  integrationController.getIntegrations
);

// Get integration setup guide (no auth required for setup info)
router.get(
  "/setup/:type",
  validate(integrationValidation.getSetupGuide),
  integrationController.getIntegrationSetupGuide
);

// Get OAuth URL for integration
router.get(
  "/oauth/:type",
  authWithIntegrations("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.getOAuthUrl),
  integrationController.getOAuthUrl
);

// OAuth callback (no auth required - handled by OAuth provider)
router.get(
  "/oauth/callback/:type",
  validate(integrationValidation.handleOAuthCallback),
  integrationController.handleOAuthCallback
);

// Update integration configuration
router.put(
  "/:type/config",
  authWithIntegrations("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.updateIntegrationConfig),
  integrationController.updateIntegrationConfig
);

// Disconnect integration
router.delete(
  "/:type",
  authWithIntegrations("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.disconnectIntegration),
  integrationController.disconnectIntegration
);

// Check integration health
router.get(
  "/:type/health",
  authWithIntegrations("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.checkIntegrationHealth),
  integrationController.checkIntegrationHealth
);

export default router;
