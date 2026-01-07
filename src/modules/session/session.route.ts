import express, { Router } from "express";
import sessionController from "./session.controller";
import validate from "../../middlewares/validate";
import sessionValidation from "./session.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

router.post(
  "/",
  auth("clinitian_sessions"),
  validate(sessionValidation.createSession),
  sessionController.createSession
);

router.get(
  "/",
  auth("clinitian_sessions"),
  validate(sessionValidation.getSessions),
  sessionController.getSessions
);

router.get(
  "/:sessionId",
  auth("clinitian_sessions"),
  validate(sessionValidation.getSession),
  sessionController.getSession
);

router.put(
  "/:sessionId",
  auth("clinitian_sessions"),
  validate(sessionValidation.updateSession),
  sessionController.updateSession
);

router.delete(
  "/:sessionId",
  auth("clinitian_sessions"),
  validate(sessionValidation.deleteSession),
  sessionController.deleteSession
);

export default router;
