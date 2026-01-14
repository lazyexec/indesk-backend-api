import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError";
import httpStatus from "http-status";
import subscriptionService from "../modules/subscription/subscription.service";
import planService from "../modules/subscription/plan.service";
import prisma from "../configs/prisma";
import { SubscriptionStatus } from "../../generated/prisma/client";

interface AuthenticatedRequest extends Request {
  user?: any; // Use any to avoid type conflicts with existing auth system
}

const getClinicIdFromUser = async (userId: string): Promise<string | null> => {
  // For clinic owners
  const ownedClinic = await prisma.clinic.findFirst({
    where: { ownerId: userId },
    select: { id: true }
  });
  
  if (ownedClinic) {
    return ownedClinic.id;
  }

  // For clinic members
  const clinicMember = await prisma.clinicMember.findFirst({
    where: { userId },
    select: { clinicId: true }
  });

  return clinicMember?.clinicId || null;
};

const checkFeatureAccess = (requiredFeature: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
      }

      // Get clinic ID from user context, params, or body
      let clinicId = req.user.clinicId || req.params.clinicId || req.body.clinicId;
      
      // If no clinic ID in request, try to get it from user's associations
      if (!clinicId) {
        clinicId = await getClinicIdFromUser(req.user.id);
      }
      
      if (!clinicId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No clinic association found");
      }

      // Get current subscription
      const subscription = await subscriptionService.checkSubscriptionStatus(clinicId);
      
      // Check if subscription is active
      if (subscription.status === SubscriptionStatus.cancelled || 
          subscription.status === SubscriptionStatus.inactive) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          "Your subscription is not active. Please reactivate your subscription to access this feature."
        );
      }

      // Check if subscription is past due
      if (subscription.status === SubscriptionStatus.past_due) {
        throw new ApiError(
          httpStatus.PAYMENT_REQUIRED, 
          "Your subscription payment is past due. Please update your payment method to continue using this feature."
        );
      }

      // Check feature access
      const hasAccess = await planService.checkFeatureAccess(subscription.planId, requiredFeature);
      
      if (!hasAccess) {
        throw new ApiError(
          httpStatus.FORBIDDEN, 
          `This feature requires a higher plan. Your current plan (${subscription.plan.name}) does not include ${requiredFeature}. Please upgrade your subscription.`
        );
      }

      // Add subscription info to request for potential use in controllers
      req.user.subscription = subscription;
      req.user.clinicId = clinicId;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

const requireActiveSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
    }

    // Get clinic ID from user context, params, or body
    let clinicId = req.user.clinicId || req.params.clinicId || req.body.clinicId;
    
    // If no clinic ID in request, try to get it from user's associations
    if (!clinicId) {
      clinicId = await getClinicIdFromUser(req.user.id);
    }
    
    if (!clinicId) {
      throw new ApiError(httpStatus.BAD_REQUEST, "No clinic association found");
    }

    const subscription = await subscriptionService.checkSubscriptionStatus(clinicId);
    
    // Allow access for active, trialing subscriptions
    if (subscription.status === SubscriptionStatus.active || 
        subscription.status === SubscriptionStatus.trialing) {
      req.user.subscription = subscription;
      req.user.clinicId = clinicId;
      return next();
    }

    // Block access for cancelled, inactive, or past_due subscriptions
    let message = "Your subscription is not active.";
    
    switch (subscription.status) {
      case SubscriptionStatus.cancelled:
        message = "Your subscription has been cancelled. Please reactivate to continue.";
        break;
      case SubscriptionStatus.past_due:
        message = "Your subscription payment is past due. Please update your payment method.";
        break;
      case SubscriptionStatus.inactive:
        message = "Your subscription is inactive. Please contact support.";
        break;
    }

    throw new ApiError(httpStatus.FORBIDDEN, message);
  } catch (error) {
    next(error);
  }
};

// Specific feature gates for common features
const requireIntegrations = checkFeatureAccess('integrations');
const requireAdvancedReporting = checkFeatureAccess('advanced_reporting');
const requirePrioritySupport = checkFeatureAccess('priority_support');
const requireCustomBranding = checkFeatureAccess('custom_branding');

export {
  checkFeatureAccess,
  requireActiveSubscription,
  requireIntegrations,
  requireAdvancedReporting,
  requirePrioritySupport,
  requireCustomBranding,
};