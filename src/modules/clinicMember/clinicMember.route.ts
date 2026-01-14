import express, { Router } from "express";
import clinicMemberController from "./clinicMember.controller";
import validate from "../../middlewares/validate";
import clinicMemberValidation from "./clinicMember.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router({ mergeParams: true });

router.post(
  "/",
  auth("commonAdmin"),
  validate(clinicMemberValidation.addMember),
  clinicMemberController.addMember
);

router.get(
  "/",
  auth("clinician_clinicians", "commonAdmin"),
  validate(clinicMemberValidation.getMembers),
  clinicMemberController.getMembers
);

router.delete(
  "/",
  auth("common"),
  validate(clinicMemberValidation.removeMember),
  clinicMemberController.removeMember
);

export default router;
