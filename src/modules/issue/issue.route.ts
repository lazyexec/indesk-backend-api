import express from "express";
import issueController from "./issue.controller";
import issueValidation from "./issue.validation";
import auth from "../../middlewares/auth";
import validate from "../../middlewares/validate";

const router = express.Router();

// User routes (authenticated users can report and manage their issues)
router
  .route("/")
  .post(
    auth(),
    validate(issueValidation.createIssue),
    issueController.createIssue
  )
  .get(
    auth('provider'),
    validate(issueValidation.getIssues),
    issueController.getIssues
  );

// Get user's issues summary
router
  .route("/my-summary")
  .get(
    auth(),
    issueController.getMyIssuesSummary
  );

// Admin-only route for statistics
router
  .route("/stats")
  .get(
    auth(),
    issueController.getIssueStats
  );

// Individual issue routes
router
  .route("/:id")
  .get(
    auth(),
    validate(issueValidation.getIssue),
    issueController.getIssue
  )
  .patch(
    auth(),
    validate(issueValidation.updateIssue),
    issueController.updateIssue
  )
  .delete(
    auth(),
    validate(issueValidation.deleteIssue),
    issueController.deleteIssue
  );

export default router;