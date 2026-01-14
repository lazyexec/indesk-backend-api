import express, { Router } from "express";
import clientController from "./client.controller";
import validate from "../../middlewares/validate";
import clientValidation from "./client.validation";
import { authWithActiveSubscription } from "../../middlewares/authWithSubscription";

const router: Router = express.Router();

router.post(
  "/",
  authWithActiveSubscription("clinician_clients"),
  validate(clientValidation.createClient),
  clientController.createClient
);

router.get(
  "/",
  authWithActiveSubscription("clinician_clients"),
  validate(clientValidation.getClients),
  clientController.getClients
);

router.get(
  "/:clientId",
  authWithActiveSubscription("clinician_clients"),
  validate(clientValidation.getClient),
  clientController.getClient
);

router.put(
  "/:clientId",
  authWithActiveSubscription("clinician_clients"),
  validate(clientValidation.updateClient),
  clientController.updateClient
);

router.delete(
  "/:clientId",
  authWithActiveSubscription("clinician_clients"),
  validate(clientValidation.deleteClient),
  clientController.deleteClient
);

export default router;
