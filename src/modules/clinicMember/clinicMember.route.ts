import express, { Router } from "express";
import clinicMemberController from "./clinicMember.controller";
import validate from "../../middlewares/validate";
import clinicMemberValidation from "./clinicMember.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router({ mergeParams: true });

router.post(
  "/add/member",
  auth("commonAdmin"),
  validate(clinicMemberValidation.addMember),
  clinicMemberController.addMember
);

router.get(
  "/get/members",
  auth("clinician_clinicians", "commonAdmin"),
  validate(clinicMemberValidation.getMembers),
  clinicMemberController.getMembers
);

router.delete(
  "/remove/member",
  auth("common"),
  validate(clinicMemberValidation.removeMember),
  clinicMemberController.removeMember
);

export default router;
