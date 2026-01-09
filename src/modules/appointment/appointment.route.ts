import express, { Router } from "express";
import sessionController from "./appointment.controller";
import validate from "../../middlewares/validate";
import sessionValidation from "./appointment.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

// Authenticated routes (for clinicians/admins)
router.post(
  "/",
  auth("clinician_appointments"),
  validate(sessionValidation.createAppointment),
  sessionController.createAppointment
);

router.get(
  "/client/:clientId",
  auth("clinician_appointments"),
  validate(sessionValidation.getClientAppointments),
  sessionController.getClientAppointments
);

router.get(
  "/:appointmentId",
  auth("clinician_appointments"),
  validate(sessionValidation.getAppointmentById),
  sessionController.getAppointmentById
);

// Public routes (no authentication required)
router.get(
  "/public/token/:token",
  validate(sessionValidation.getAppointmentByToken),
  sessionController.getAppointmentByToken
);

router.post(
  "/public/payment",
  validate(sessionValidation.createPaymentSession),
  sessionController.createPaymentSession
);

export default router;
