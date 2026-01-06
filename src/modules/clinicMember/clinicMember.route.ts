import express, { Router } from "express";
import clinicMemberController from "./clinicMember.controller";
import validate from "../../middlewares/validate";
import clinicMemberValidation from "./clinicMember.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router({ mergeParams: true });

router.post(
  "/:clinicId",
  auth("common"),
  validate(clinicMemberValidation.addMember),
  clinicMemberController.addMember
);

router.get(
  "/",
  auth("clinician_clinicians"),
  validate(clinicMemberValidation.getMembers),
  clinicMemberController.getMembers
);

router.delete(
  "/:memberId",
  auth("common"),
  validate(clinicMemberValidation.removeMember),
  clinicMemberController.removeMember
);

export default router;
