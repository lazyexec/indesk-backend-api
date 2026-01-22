import express from "express";
import clinicalNoteController from "./clinicalNote.controller";
import auth from "../../middlewares/auth";
import validate from "../../middlewares/validate";
import clinicalNoteValidation from "./clinicalNote.validation";

const router = express.Router();

router
  .route("/")
  .post(
    auth("commonAdmin", "clinician_clients"),
    validate(clinicalNoteValidation.createClinicalNote),
    clinicalNoteController.createClinicalNote,
  )
  .get(
    auth("commonAdmin", "clinician_clients"),
    validate(clinicalNoteValidation.getClinicalNotes),
    clinicalNoteController.getClinicalNotes,
  );

router
  .route("/:clinicalNoteId")
  .get(
    auth("commonAdmin", "clinician_clients"),
    validate(clinicalNoteValidation.getClinicalNote),
    clinicalNoteController.getClinicalNote,
  )
  .patch(
    auth("commonAdmin", "clinician_clients"),
    validate(clinicalNoteValidation.updateClinicalNote),
    clinicalNoteController.updateClinicalNote,
  )
  .delete(
    auth("commonAdmin", "clinician_clients"),
    validate(clinicalNoteValidation.deleteClinicalNote),
    clinicalNoteController.deleteClinicalNote,
  );

export default router;
