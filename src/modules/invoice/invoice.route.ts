import express from "express";
import invoiceController from "./invoice.controller";
import auth from "../../middlewares/auth";
import validate from "../../middlewares/validate";
import invoiceValidation from "./invoice.validation";

const router = express.Router();

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

export default router;
