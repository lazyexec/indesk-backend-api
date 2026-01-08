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

router.post(
  "/",
  auth("provider"),
  validate(clinicValidation.createClinic),
  upload,
  clinicController.createClinic
);

router.get(
  "/",
  auth("provider"),
  validate(clinicValidation.getClinics),
  clinicController.getClinics
);

router.get(
  "/:clinicId",
  auth("provider"),
  validate(clinicValidation.getClinic),
  clinicController.getClinic
);

router.put(
  "/:clinicId",
  auth("commonAdmin"),
  validate(clinicValidation.updateClinic),
  upload,
  clinicController.updateClinic
);

router.patch(
  "/:clinicId/permissions",
  auth("commonAdmin"),
  validate(clinicValidation.updatePermissions),
  clinicController.updatePermissions
);

router.delete(
  "/:clinicId",
  auth("commonAdmin"),
  validate(clinicValidation.deleteClinic),
  clinicController.deleteClinic
);

export default router;
