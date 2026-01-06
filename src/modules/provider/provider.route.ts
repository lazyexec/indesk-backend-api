import express, { Router } from "express";
import auth from "../../middlewares/auth";
import providerController from "./provider.controller";
import validate from "../../middlewares/validate";
import providerValidation from "./provider.validation";

const router: Router = express.Router();

// Clinic Routes
router.post("/clinic/create", validate(providerValidation.createClinic),auth("common"), providerController.createClinic);
router.delete(
  "/clinic/delete/:id",
  validate(providerValidation.deleteClinic),
  auth("common"),
  providerController.deleteClinic
);
export default router;
