import express, { Router } from "express";
import clinicController from "./clinic.controller";
import validate from "../../middlewares/validate";
import clinicValidation from "./clinic.validation";
import auth from "../../middlewares/auth";
import uploader from "../../middlewares/fileUploader";

const upload = uploader("./public/uploads/all").fields([
  { name: "logo", maxCount: 1 },
]);

const router: Router = express.Router();

// Provider routes (admin access to all clinics)
router.post(
  '/provider/create',
  auth('provider'),
  validate(clinicValidation.createClinic),
  clinicController.createClinicForProvider
);
router.get(
  "/provider/all",
  auth("provider"),
  validate(clinicValidation.getClinics),
  clinicController.getAllClinicsForProvider
);

router.get(
  "/provider/:clinicId",
  auth("provider"),
  validate(clinicValidation.getClinic),
  clinicController.getClinicByIdForProvider
);

// Clinic member routes (uses authenticated user's clinic)
router.get(
  "/",
  auth('common'),
  clinicController.getOwnClinic
);

router.put(
  "/",
  auth("commonAdmin"),
  validate(clinicValidation.updateClinic),
  upload,
  clinicController.updateOwnClinic
);

router.patch(
  "/permissions",
  auth("clinician_permissions"),
  validate(clinicValidation.updatePermissions),
  clinicController.updateOwnClinicPermissions
);

router.delete(
  "/",
  auth("superAdmin"),
  clinicController.deleteOwnClinic
);

export default router;
