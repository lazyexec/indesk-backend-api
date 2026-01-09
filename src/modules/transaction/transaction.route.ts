import express from "express";
import auth from "../../middlewares/auth";
import validate from "../../middlewares/validate";
import transactionValidation from "./transaction.validation";
import transactionController from "./transaction.controller";
import stripeController from "../stripe/stripe.controller";

const router = express.Router();

router.get(
  "/all",
  auth("admin"),
  validate(transactionValidation.getAllTransactions),
  transactionController.getAllTransactions
);

router.delete(
  "/delete/:transactionId",
  auth("admin"),
  validate(transactionValidation.getTransaction),
  transactionController.deleteTransaction
);

router.get(
  "/:transactionId",
  auth("common"),
  validate(transactionValidation.getTransaction),
  transactionController.getTransaction
);

export default router;
