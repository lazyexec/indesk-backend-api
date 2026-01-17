import express, { Router } from "express";
import clinicMemberController from "./clinicMember.controller";
import validate from "../../middlewares/validate";
import clinicMemberValidation from "./clinicMember.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

router.post(
  "/",
  auth("clinician_clinicians"),
  validate(clinicMemberValidation.addMember),
  clinicMemberController.addMember
);

router.get(
  "/",
  auth("clinician_clinicians"),
  validate(clinicMemberValidation.getMembers),
  clinicMemberController.getMembers
);

router.patch(
  "/:memberId",
  auth("clinician_clinicians"),
  validate(clinicMemberValidation.updateMember),
  clinicMemberController.updateMember
);

router.patch(
  "/:memberId/role",
  auth("clinician_clinicians"),
  validate(clinicMemberValidation.updateMemberRole),
  clinicMemberController.updateMemberRole
);

router.delete(
  "/:memberId",
  auth("clinician_clinicians"),
  validate(clinicMemberValidation.removeMember),
  clinicMemberController.removeMember
);

export default router;
