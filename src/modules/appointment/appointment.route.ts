import express, { Router } from "express";
import sessionController from "./appointment.controller";
import validate from "../../middlewares/validate";
import sessionValidation from "./appointment.validation";
import { authWithActiveSubscription } from "../../middlewares/authWithSubscription";

const router: Router = express.Router();

// Authenticated routes (for clinicians/admins)
router.post(
  "/",
  authWithActiveSubscription("clinician_appointments"),
  validate(sessionValidation.createAppointment),
  sessionController.createAppointment
);

// Calendar dashboard routes
router.get(
  "/calendar/clinic",
  authWithActiveSubscription("clinician_appointments"),
  validate(sessionValidation.getCalendarAppointments),
  sessionController.getClinicCalendarAppointments
);

router.get(
  "/calendar/my-schedule",
  authWithActiveSubscription("clinician_appointments"),
  validate(sessionValidation.getCalendarAppointments),
  sessionController.getClinicianSchedule
);

router.get(
  "/calendar/stats",
  authWithActiveSubscription("clinician_appointments"),
  validate(sessionValidation.getCalendarStats),
  sessionController.getCalendarStats
);

router.get(
  "/clinician/:clinicMemberId",
  authWithActiveSubscription("clinician_appointments"),
  validate(sessionValidation.getAppointmentsByClinicMemberId),
  sessionController.getAppointmentsByClinicMemberId
);

router.get(
  "/client/:clientId",
  authWithActiveSubscription("clinician_appointments"),
  validate(sessionValidation.getClientAppointments),
  sessionController.getClientAppointments
);

router.get(
  "/:appointmentId",
  authWithActiveSubscription("clinician_appointments"),
  validate(sessionValidation.getAppointmentById),
  sessionController.getAppointmentById
);

router.get(
  "/",
  authWithActiveSubscription("clinician_appointments"),
  // validate(sessionValidation.getAllAppointments), // Optional: Add validation for filters
  sessionController.getAllAppointments
);

router.patch(
  "/:appointmentId",
  authWithActiveSubscription("clinician_appointments"),
  // validate(sessionValidation.updateAppointment),
  sessionController.updateAppointment
);

router.patch(
  "/:appointmentId/status",
  authWithActiveSubscription("clinician_appointments"),
  // validate(sessionValidation.updateAppointmentStatus),
  sessionController.updateAppointmentStatus
);

router.delete(
  "/:appointmentId",
  authWithActiveSubscription("clinician_appointments"),
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
