import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import plansService from "./plans.service";
import response from "../../utils/response";
import pick from "../../utils/pick";

/**
 * Get available plans for clinic purchase
 */
const getAvailablePlans = catchAsync(async (req: Request, res: Response) => {
  const plans = await plansService.getAvailablePlans();
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Available plans retrieved successfully",
      data: plans,
    })
  );
});

/**
 * Get user's clinic purchase status
 */
const getPurchaseStatus = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  
  const status = await plansService.getPurchaseStatus(userId);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Purchase status retrieved successfully",
      data: status,
    })
  );
});

/**
 * Initiate clinic purchase
 */
const initiatePurchase = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  const purchaseData = pick(req.body, [
    "clinicName",
    "clinicEmail", 
    "clinicPhone",
    "countryCode",
    "address",
    "description",
    "planType",
    "startTrial"
  ]);
  
  const result = await plansService.initiatePurchase(userId, purchaseData);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic purchase initiated successfully",
      data: result,
    })
  );
});

/**
 * Complete free clinic setup (no payment required)
 */
const completeFreePurchase = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  const { clinicId, planId } = req.body;
  
  const result = await plansService.completeFreePurchase(userId, clinicId, planId);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: result.message,
      data: result,
    })
  );
});

/**
 * Cancel pending clinic purchase
 */
const cancelPurchase = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  const { clinicId } = req.params;
  
  await plansService.cancelPurchase(userId, clinicId);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic purchase cancelled successfully",
      data: null,
    })
  );
});

export default {
  getAvailablePlans,
  getPurchaseStatus,
  initiatePurchase,
  completeFreePurchase,
  cancelPurchase,
};
