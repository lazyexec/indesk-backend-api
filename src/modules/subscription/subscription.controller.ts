import { Request, Response } from "express";
import httpStatus from "http-status";
import subscriptionService from "./subscription.service";
import planService from "./plan.service";
import limitService from "./limit.service";
import stripeService from "../stripe/stripe.service";
import ApiError from "../../utils/ApiError";
import catchAsync from "../../utils/catchAsync";
import response from "../../utils/response";
import { PlanType, SubscriptionStatus } from "@prisma/client";

interface AuthenticatedRequest extends Request {
  user?: any; // Use any to avoid type conflicts with existing auth system
}

const getCurrentSubscription = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.clinicId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No clinic association found");
  }

  const subscription = await subscriptionService.checkSubscriptionStatus(req.user.clinicId);
  const usageStats = await limitService.getUsageStats(req.user.clinicId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Subscription retrieved successfully",
      data: {
        subscription,
        usage: usageStats,
      }
    })
  );
});

const getAllPlans = catchAsync(async (req: Request, res: Response) => {
  const plans = await planService.getAllPlans();

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Plans retrieved successfully",
      data: plans
    })
  );
});

const upgradeSubscription = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { planType } = req.body;

  if (!req.user?.clinicId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No clinic association found");
  }

  if (!planType) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Plan type is required");
  }

  // Get the new plan
  const newPlan = await planService.getPlanByType(planType);

  // Get current subscription
  const currentSubscription = await subscriptionService.getSubscriptionByClinicId(req.user.clinicId);

  // If upgrading to a paid plan and no Stripe customer exists, create one
  if (newPlan.price > 0 && !currentSubscription.stripeCustomerId) {
    // This would typically require clinic/user info to create customer
    throw new ApiError(httpStatus.BAD_REQUEST, "Stripe customer setup required for paid plans");
  }

  // Update local subscription
  const updatedSubscription = await subscriptionService.updateSubscription(currentSubscription.id, {
    planId: newPlan.id,
    status: SubscriptionStatus.active,
  });

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Subscription upgraded successfully",
      data: updatedSubscription
    })
  );
});

const cancelSubscription = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.clinicId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No clinic association found");
  }

  const subscription = await subscriptionService.getSubscriptionByClinicId(req.user.clinicId);

  // If there's a Stripe subscription, cancel it
  if (subscription.stripeSubscriptionId) {
    await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
  }

  // Update local subscription to cancelled
  const cancelledSubscription = await subscriptionService.cancelSubscription(req.user.clinicId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Subscription cancelled successfully",
      data: cancelledSubscription
    })
  );
});

const startTrial = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.clinicId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No clinic association found");
  }

  // Get professional plan for trial
  const professionalPlan = await planService.getPlanByType(PlanType.professional);

  // Calculate trial dates (14 days)
  const trialStart = new Date();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  // Update subscription to trial
  const subscription = await subscriptionService.updateSubscriptionByClinicId(req.user.clinicId, {
    planId: professionalPlan.id,
    status: SubscriptionStatus.trialing,
    trialStart,
    trialEnd,
  });

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Trial started successfully",
      data: subscription
    })
  );
});

const getUsageStats = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.clinicId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No clinic association found");
  }

  const usageStats = await limitService.getUsageStats(req.user.clinicId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Usage stats retrieved successfully",
      data: usageStats
    })
  );
});

export default {
  getCurrentSubscription,
  getAllPlans,
  upgradeSubscription,
  cancelSubscription,
  startTrial,
  getUsageStats,
};