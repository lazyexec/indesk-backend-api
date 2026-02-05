import express from "express";
import aiAssistantController from "./ai-assistant.controller";
import validate from "../../middlewares/validate";
import aiAssistantValidation from "./ai-assistant.validation";
import auth from "../../middlewares/auth";

const router = express.Router();

// Chat with AI assistant
router.post(
    "/chat",
    auth("clinician_ai"),
    validate(aiAssistantValidation.chat),
    aiAssistantController.chat
);

// Draft email for client
router.post(
    "/draft-email",
    auth("clinician_ai"),
    validate(aiAssistantValidation.draftEmail),
    aiAssistantController.draftEmail
);

// Summarize schedule
router.post(
    "/summarize-schedule",
    auth("clinician_ai"),
    validate(aiAssistantValidation.summarizeSchedule),
    aiAssistantController.summarizeSchedule
);

// Create invoice with AI assistance
router.post(
    "/create-invoice",
    auth("clinician_ai"),
    validate(aiAssistantValidation.createInvoice),
    aiAssistantController.createInvoice
);

// Get AI suggestions
router.get(
    "/suggestions",
    auth("clinician_ai"),
    validate(aiAssistantValidation.suggestions),
    aiAssistantController.getSuggestions
);

export default router;
