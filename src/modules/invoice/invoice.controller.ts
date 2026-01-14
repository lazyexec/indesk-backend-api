import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import response from "../../utils/response";
import invoiceService from "./invoice.service";
import clinicService from "../clinic/clinic.service";
import ApiError from "../../utils/ApiError";
import pick from "../../utils/pick";

const createInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id as string;
  const clinicId = await clinicService.getClinicIdByUserId(userId);
  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found for this user");
  }

  const invoice = await invoiceService.createInvoice(clinicId, req.body);

  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Invoice created successfully",
      data: invoice,
    })
  );
});

const getInvoices = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id as string;
  const clinicId = await clinicService.getClinicIdByUserId(userId);
  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found for this user");
  }

  const filter = pick(req.query, ["clientName", "status", "clientId"]);
  const options = pick(req.query, ["sortBy", "limit", "page", "sortOrder"]);

  const result = await invoiceService.getInvoices(clinicId, filter, options);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Invoices retrieved successfully",
      data: result,
    })
  );
});

const getInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id as string;
  const clinicId = await clinicService.getClinicIdByUserId(userId);
  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found for this user");
  }

  const invoice = await invoiceService.getInvoiceById(
    clinicId,
    req.params.invoiceId
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Invoice retrieved successfully",
      data: invoice,
    })
  );
});

const updateInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id as string;
  const clinicId = await clinicService.getClinicIdByUserId(userId);
  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found for this user");
  }

  const invoice = await invoiceService.updateInvoice(
    clinicId,
    req.params.invoiceId,
    req.body
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Invoice updated successfully",
      data: invoice,
    })
  );
});

const deleteInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id as string;
  const clinicId = await clinicService.getClinicIdByUserId(userId);
  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found for this user");
  }

  await invoiceService.deleteInvoice(clinicId, req.params.invoiceId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Invoice deleted successfully",
      data: null,
    })
  );
});

const getInvoiceStats = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id as string;
  const clinicId = await clinicService.getClinicIdByUserId(userId);
  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found for this user");
  }

  const stats = await invoiceService.getInvoiceStats(clinicId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Invoice stats retrieved successfully",
      data: stats,
    })
  );
});

export default {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
};
