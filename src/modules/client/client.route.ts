import express, { Router } from "express";
import clientController from "./client.controller";
import validate from "../../middlewares/validate";
import clientValidation from "./client.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

router.post(
  "/",
  auth("clinician_clients"),
  validate(clientValidation.createClient),
  clientController.createClient,
);

router.get(
  "/",
  auth("clinician_clients"),
  validate(clientValidation.getClients),
  clientController.getClients,
);

router.put(
  "/:clientId",
  auth("clinician_clients"),
  validate(clientValidation.updateClient),
  clientController.updateClient,
);
 
router.get(
  "/:clientId",
  auth("clinician_clients"),
  validate(clientValidation.getClient),
  clientController.getClient,
);

router.delete(
  "/:clientId",
  auth("clinician_clients"),
  validate(clientValidation.deleteClient),
  clientController.deleteClient,
);

export default router;
