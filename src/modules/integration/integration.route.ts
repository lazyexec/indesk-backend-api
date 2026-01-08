import express, { Router } from "express";
import integrationController from "./integration.controller";
import validate from "../../middlewares/validate";
import integrationValidation from "./integration.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

router.get(
  "/",
  auth("commonAdmin", "clinician_integrations"),
  integrationController.getIntegrations
);

router.post(
  "/connect",
  auth("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.connectIntegration),
  integrationController.connectIntegration
);

router.post(
  "/disconnect",
  auth("commonAdmin", "clinician_integrations"),
  validate(integrationValidation.disconnectIntegration),
  integrationController.disconnectIntegration
);

export default router;
