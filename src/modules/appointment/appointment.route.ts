import express, { Router } from "express";
import sessionController from "./appointment.controller";
import validate from "../../middlewares/validate";
import sessionValidation from "./appointment.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

// Authenticated routes (for clinicians/admins)
router.post(
  "/",
  auth("clinician_clients"),
  validate(sessionValidation.createAppointment),
  sessionController.createAppointment
);

// Calendar dashboard routes
router.get(
  "/calendar/clinic",
  auth("clinician_dashboard"),
  validate(sessionValidation.getCalendarAppointments),
  sessionController.getClinicCalendarAppointments
);

router.get(
  "/calendar/my-schedule",
  auth("clinician_dashboard"),
  validate(sessionValidation.getCalendarAppointments),
  sessionController.getClinicianSchedule
);

router.get(
  "/calendar/stats",
  auth("clinician_dashboard"),
  validate(sessionValidation.getCalendarStats),
  sessionController.getCalendarStats
);

router.get(
  "/clinician/:clinicMemberId",
  auth("clinician_clients"),
  validate(sessionValidation.getAppointmentsByClinicMemberId),
  sessionController.getAppointmentsByClinicMemberId
);

router.get(
  "/client/:clientId",
  auth("clinician_clients"),
  validate(sessionValidation.getClientAppointments),
  sessionController.getClientAppointments
);

router.get(
  "/:appointmentId",
  auth("clinician_clients"),
  validate(sessionValidation.getAppointmentById),
  sessionController.getAppointmentById
);

router.get(
  "/",
  auth("clinician_clients"),
  // validate(sessionValidation.getAllAppointments), // Optional: Add validation for filters
  sessionController.getAllAppointments
);

router.patch(
  "/:appointmentId",
  auth("clinician_clients"),
  // validate(sessionValidation.updateAppointment),
  sessionController.updateAppointment
);

router.patch(
  "/:appointmentId/status",
  auth("clinician_clients"),
  // validate(sessionValidation.updateAppointmentStatus),
  sessionController.updateAppointmentStatus
);

router.delete(
  "/:appointmentId",
  auth("clinician_clients"),
  // validate(sessionValidation.deleteAppointment),
  sessionController.deleteAppointment
);

// Public routes (no authentication required)
router.get(
  "/session/:token",
  validate(sessionValidation.getAppointmentSessionByToken),
  sessionController.getAppointmentSessionByToken
);

router.post(
  "/:token",
  validate(sessionValidation.applyAppointmentWithToken),
  sessionController.applyAppointmentWithToken
);


export default router;
