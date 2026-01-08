import express, { Router } from "express";
import sessionController from "./appointment.controller";
import validate from "../../middlewares/validate";
import sessionValidation from "./appointment.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

router.post(
  "/",
  auth("clinician_appointments"),
  validate(sessionValidation.createAppointment),
  sessionController.createAppointment
);

router.get(
  "/:clientId",
  auth("clinician_appointments"),
  validate(sessionValidation.getClientAppointments),
  sessionController.getClientAppointments
);
export default router;
