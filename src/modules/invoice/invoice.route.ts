import express from "express";
import invoiceController from "./invoice.controller";
import auth from "../../middlewares/auth";
import validate from "../../middlewares/validate";
import invoiceValidation from "./invoice.validation";

const router = express.Router();

// Public routes (no authentication required)
router.get(
  "/public/:publicToken",
  validate(invoiceValidation.getPublicInvoice),
  invoiceController.getPublicInvoice
);

router.post(
  "/public/:publicToken/create-payment-intent",
  validate(invoiceValidation.getPublicInvoice),
  invoiceController.createInvoicePaymentIntent
);

router.post(
  "/public/:publicToken/confirm-payment",
  validate(invoiceValidation.confirmInvoicePayment),
  invoiceController.confirmInvoicePayment
);

// Protected routes (authentication required)
router
  .route("/")
  .post(
    auth("commonAdmin", "clinician_invoices"),
    validate(invoiceValidation.createInvoice),
    invoiceController.createInvoice
  )
  .get(
    auth("commonAdmin", "clinician_invoices"),
    validate(invoiceValidation.getInvoices),
    invoiceController.getInvoices
  );

router.get(
  "/stats",
  auth("commonAdmin", "clinician_invoices"),
  invoiceController.getInvoiceStats
);

router
  .route("/:invoiceId")
  .get(
    auth("commonAdmin", "clinician_invoices"),
    validate(invoiceValidation.getInvoice),
    invoiceController.getInvoice
  )
  .patch(
    auth("commonAdmin", "clinician_invoices"),
    validate(invoiceValidation.updateInvoice),
    invoiceController.updateInvoice
  )
  .delete(
    auth("commonAdmin", "clinician_invoices"),
    validate(invoiceValidation.deleteInvoice),
    invoiceController.deleteInvoice
  );

router.post(
  "/:invoiceId/send-email",
  auth("commonAdmin", "clinician_invoices"),
  validate(invoiceValidation.sendInvoiceEmail),
  invoiceController.sendInvoiceEmail
);

export default router;
