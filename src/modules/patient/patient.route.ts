import express, { Router } from "express";
import patientController from "./patient.controller";
import validate from "../../middlewares/validate";
import patientValidation from "./patient.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router({ mergeParams: true });

router.post(
  "/",
  auth("clinitian_clients"),
  validate(patientValidation.createPatient),
  patientController.createPatient
);

router.get(
  "/",
  auth("clinitian_clients"),
  validate(patientValidation.getPatients),
  patientController.getPatients
);

router.get(
  "/:patientId",
  auth("clinitian_clients"),
  validate(patientValidation.getPatient),
  patientController.getPatient
);

export default router;
