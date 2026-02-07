import express, { Router } from "express";
import assessmentController from "./assessment.controller";
import validate from "../../middlewares/validate";
import assessmentValidation from "./assessment.validation";
import auth from "../../middlewares/auth";
import fileUploader from "../../middlewares/fileUploader";

const router: Router = express.Router();
const uploadAssessment = fileUploader("public/uploads/assessments").fields([
  { name: "document", maxCount: 1 },
]);

// Template Routes (Admin only)
router.post(
  "/template",
  auth("clinician_forms"),
  validate(assessmentValidation.createAssessmentTemplate),
  assessmentController.createAssessmentTemplate,
);

router.get(
  "/template",
  auth("clinician_forms"),
  validate(assessmentValidation.getAssessmentTemplates),
  assessmentController.getAssessmentTemplates,
);

router.get(
  "/template/:templateId",
  auth("clinician_forms"),
  validate(assessmentValidation.getAssessmentTemplate),
  assessmentController.getAssessmentTemplate,
);

router.put(
  "/template/:templateId",
  auth("clinician_forms"),
  validate(assessmentValidation.updateAssessmentTemplate),
  assessmentController.updateAssessmentTemplate,
);

router.delete(
  "/template/:templateId",
  auth("clinician_forms"),
  validate(assessmentValidation.deleteAssessmentTemplate),
  assessmentController.deleteAssessmentTemplate,
);

// Instance Routes
router.post(
  "/instance",
  auth("clinician_forms"),
  uploadAssessment,
  validate(assessmentValidation.createAssessmentInstance),
  assessmentController.createAssessmentInstance,
);

router.post(
  "/instance/:instanceId/share",
  auth("clinician_forms"),
  validate(assessmentValidation.shareAssessmentViaEmail),
  assessmentController.shareAssessmentViaEmail,
);

router.get(
  "/instance",
  auth("clinician_forms"),
  validate(assessmentValidation.getAssessmentInstances),
  assessmentController.getAssessmentInstances,
);

router.get(
  "/instance/client/:clientId",
  auth("clinician_forms"),
  validate(assessmentValidation.getAssessmentInstancesByClientId),
  assessmentController.getAssessmentInstancesByClientId,
);

router.get(
  "/instance/:instanceId",
  auth("clinician_forms"),
  validate(assessmentValidation.getAssessmentInstance),
  assessmentController.getAssessmentInstance,
);

// Clinician completes assessment on behalf of client
router.post(
  "/instance/:instanceId/complete",
  auth("clinician_forms"),
  validate(assessmentValidation.submitAssessmentByClinician),
  assessmentController.submitAssessmentByClinician,
);

// AI-powered assessment generation
router.post(
  "/ai/generate",
  auth("clinician_forms"),
  validate(assessmentValidation.createAssessmentAi),
  assessmentController.createAssessmentWithAi,
);

// Public routes (for patients)
router.get(
  "/token/:token",
  validate(assessmentValidation.getAssessmentByToken),
  assessmentController.getAssessmentByToken,
);

router.post(
  "/token/:token/submit",
  validate(assessmentValidation.submitAssessment),
  assessmentController.submitAssessment,
);

export default router;
