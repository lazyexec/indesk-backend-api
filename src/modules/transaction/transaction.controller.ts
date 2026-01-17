import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import response from "../../utils/response";
import transactionService from "./transaction.service";
import pick from "../../utils/pick";

const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, []);
  const options = pick(req.query, ["sort", "limit", "page"]);
  const transactions = await transactionService.getAllTransactions(
    filter,
    options
  );
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "All transactions retrieved successfully",
      data: transactions,
    })
  );
});

const getClinicTransactions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  // Get clinic ID from user
  const clinicService = (await import("../clinic/clinic.service")).default;
  const clinicId = await clinicService.getClinicIdByUserId(userId!);

  if (!clinicId) {
    return res.status(httpStatus.NOT_FOUND).json(
      response({
        status: httpStatus.NOT_FOUND,
        message: "Clinic not found for this user",
      })
    );
  }

  const options = pick(req.query, ["limit", "page", "type", "status"]);
  const transactions = await transactionService.getTransactionsByClinicId(
    clinicId,
    options
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic transactions retrieved successfully",
      data: transactions,
    })
  );
});

const getTransaction = catchAsync(async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  const transaction = await transactionService.getTransaction(transactionId!);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Transaction retrieved successfully",
      data: transaction,
    })
  );
});


const deleteTransaction = catchAsync(async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  await transactionService.deleteTransaction(transactionId!);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Transaction deleted successfully",
      data: {},
    })
  );
});

export default {
  getAllTransactions,
  getClinicTransactions,
  getTransaction,
  deleteTransaction,
};
