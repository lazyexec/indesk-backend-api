import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { PlanType } from "../../../generated/prisma/client";
import stripeService from "../stripe/stripe.service";
import subscriptionService from "../subscription/subscription.service";
import planService from "../subscription/plan.service";
import permissions from "../../configs/permissions";
import stripeConfig from "../../configs/stripe";
import env from "../../configs/env";

interface IPurchaseData {
  // Clinic details
  clinicName: string;
  clinicEmail: string;
  clinicPhone?: string;
  countryCode?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  description?: string;

  // Subscription details
  planType: PlanType;

  // Payment details (for Stripe)
  paymentMethodId?: string;

  // Optional: Trial or immediate activation
  startTrial?: boolean;
}

interface IPurchaseResult {
  clinic: any;
  subscription: any;
  paymentIntent?: any;
  setupComplete: boolean;
  message: string;
}

interface ICreatePlanData {
  name: string;
  type: PlanType;
  description?: string;
  price: number;
  clinicianLimit: number;
}

/**
 * Create a new subscription plan
 */
const createPlan = async (data: ICreatePlanData) => {
  const plan = await planService.createPlan({
    name: data.name,
    type: data.type,
    description: data.description,
    price: data.price,
    clientLimit: 0, // Default to unlimited clients
    clinicianLimit: data.clinicianLimit,
    features: {},
  });

  return {
    id: plan.id,
    name: plan.name,
    type: plan.type,
    description: plan.description,
    price: plan.price,
    clinicianLimit: plan.clinicianLimit,
    clientLimit: plan.clientLimit,
    isActive: plan.isActive,
  };
};

/**
 * Initiate clinic purchase process
 * Creates a pending clinic and returns Stripe Checkout Session URL
 */
const initiatePurchase = async (
  userId: string,
  purchaseData: IPurchaseData
): Promise<{ checkoutUrl: string; clinicId: string; planId: string }> => {
  const {
    clinicName,
    clinicEmail,
    clinicPhone,
    countryCode,
    address,
    description,
    planType,
    startTrial = false,
  } = purchaseData;

  // Check if user already owns a clinic
  const existingClinic = await prisma.clinic.findFirst({
    where: { ownerId: userId },
  });

  if (existingClinic) {
    if (existingClinic.isActive) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "You already own a clinic. Each user can only own one clinic."
      );
    } else {
      await prisma.clinic.delete({
        where:
        {
          ownerId: userId
        }
      })
    }
  }

  // Get the selected plan
  const plan = await planService.getPlanByType(planType);

  // Create pending clinic (not activated yet)
  const clinic = await prisma.clinic.create({
    data: {
      name: clinicName,
      email: clinicEmail,
      phoneNumber: clinicPhone,
      countryCode,
      address: address || {},
      description,
      ownerId: userId,
      isActive: false, // Will be activated after successful payment
      permissions: permissions, // Default permissions
    },
  });

  let checkoutUrl: string;

  if (startTrial || plan.price === 0) {
    // For free plans or trials, no payment needed - return a special URL
    checkoutUrl = "no_payment_required";
  } else {
    // Use centralized Stripe config to create checkout session
    const session = await stripeConfig.createSubscriptionCheckout({
      planName: `${plan.name} Plan`,
      planDescription: plan.description || `${plan.name} subscription for ${clinicName}`,
      amount: plan.price,
      currency: "usd",
      interval: "month",
      metadata: {
        userId,
        clinicId: clinic.id,
        planId: plan.id,
        planType: plan.type,
        purchaseType: "clinic_subscription",
      },
      subscriptionMetadata: {
        userId,
        clinicId: clinic.id,
        planId: plan.id,
        planType: plan.type,
      },
      successUrl: `${env.FRONTEND_URL}/clinic/setup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${env.FRONTEND_URL}/clinic/setup/cancelled`,
      customerEmail: clinicEmail,
    });

    checkoutUrl = session.url || "";
  }

  return {
    checkoutUrl,
    clinicId: clinic.id,
    planId: plan.id,
  };
};

/**
 * Complete clinic purchase after successful payment
 * Activates clinic and creates subscription
 * NOTE: This is now handled by webhook (checkout.session.completed)
 * Keeping this function for reference/manual recovery if needed
 */
const completePurchase = async (
  paymentIntentId: string
): Promise<IPurchaseResult> => {
  // Retrieve payment intent from Stripe to get metadata
  const paymentIntent = await stripeConfig.getPaymentIntent(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payment was not successful. Cannot complete clinic purchase."
    );
  }

  const { userId, clinicId, planId } = paymentIntent.metadata as any;

  // Get clinic and plan details
  const [clinic, plan] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);

  if (!clinic || !plan) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Clinic or plan not found"
    );
  }

  // Activate the clinic
  const activatedClinic = await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      isActive: true,
      activatedAt: new Date(),
    },
  });

  // Create subscription
  const subscription = await subscriptionService.createSubscription({
    clinicId,
    planId,
    status: "active",
    stripeSubscriptionId: paymentIntent.id, // Use payment intent ID as reference
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  // Add user as clinic owner in clinic members (for permissions)
  await prisma.clinicMember.create({
    data: {
      userId,
      clinicId,
      role: "superAdmin",
      availability: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      specialization: [],
    },
  });

  return {
    clinic: activatedClinic,
    subscription,
    paymentIntent,
    setupComplete: true,
    message: "Clinic purchased successfully! You can now start managing your clinic.",
  };
};

/**
 * Complete free clinic setup (no payment required)
 */
const completeFreePurchase = async (
  userId: string,
  clinicId: string,
  planId: string
): Promise<IPurchaseResult> => {
  // Get clinic and plan details
  const [clinic, plan] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);

  if (!clinic || !plan) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Clinic or plan not found"
    );
  }

  if (clinic.ownerId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only activate your own clinic"
    );
  }

  // Activate the clinic
  const activatedClinic = await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      isActive: true,
      activatedAt: new Date(),
    },
  });

  // Create subscription (free or trial)
  const subscriptionData: any = {
    clinicId,
    planId,
    status: plan.type === "free" ? "active" : "trialing",
    currentPeriodStart: new Date(),
  };

  if (plan.type === "free") {
    // Free plan - no end date
    subscriptionData.currentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  } else {
    // Trial plan - 14 days
    subscriptionData.currentPeriodEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    subscriptionData.trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  }

  const subscription = await subscriptionService.createSubscription(subscriptionData);

  // Add user as clinic owner in clinic members
  await prisma.clinicMember.create({
    data: {
      userId,
      clinicId,
      role: "superAdmin",
      availability: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      specialization: [],
    },
  });

  return {
    clinic: activatedClinic,
    subscription,
    setupComplete: true,
    message: plan.type === "free"
      ? "Free clinic setup completed! You can now start managing your clinic."
      : "Trial clinic setup completed! You have 14 days to explore all features.",
  };
};

/**
 * Cancel pending clinic purchase
 */
const cancelPurchase = async (userId: string, clinicId: string): Promise<void> => {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  if (clinic.ownerId !== userId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only cancel your own clinic purchase"
    );
  }

  if (clinic.isActive) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot cancel an already activated clinic"
    );
  }

  // Delete the pending clinic
  await prisma.clinic.delete({
    where: { id: clinicId },
  });
};

/**
 * Get available plans for clinic purchase
 */
const getAvailablePlans = async () => {
  const plans = await planService.getAllPlans();

  return plans.map(plan => ({
    id: plan.id,
    name: plan.name,
    type: plan.type,
    description: plan.description,
    price: plan.price,
    clientLimit: plan.clientLimit,
    clinicianLimit: plan.clinicianLimit,
    features: plan.features,
    isPopular: plan.type === "professional", // Mark professional as popular
    savings: plan.type === "enterprise" ? "Save 20%" : null,
  }));
};

/**
 * Get clinic purchase status
 */
const getPurchaseStatus = async (userId: string) => {
  // Check if user has any clinics
  const clinic = await prisma.clinic.findFirst({
    where: { ownerId: userId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!clinic) {
    return {
      hasClinic: false,
      status: "no_clinic",
      message: "You don't have a clinic yet. Start by purchasing a plan.",
    };
  }

  if (!clinic.isActive) {
    return {
      hasClinic: true,
      clinicId: clinic.id,
      status: "pending_activation",
      message: "Your clinic is pending activation. Complete the payment to activate.",
    };
  }

  const activeSubscription = clinic.subscription;

  return {
    hasClinic: true,
    clinicId: clinic.id,
    status: "active",
    clinic: {
      id: clinic.id,
      name: clinic.name,
      email: clinic.email,
      isActive: clinic.isActive,
      activatedAt: clinic.activatedAt,
    },
    subscription: activeSubscription ? {
      id: activeSubscription.id,
      plan: activeSubscription.plan,
      status: activeSubscription.status,
      currentPeriodEnd: activeSubscription.currentPeriodEnd,
      trialEnd: activeSubscription.trialEnd,
    } : null,
    message: "Your clinic is active and ready to use.",
  };
};

export default {
  createPlan,
  initiatePurchase,
  completeFreePurchase,
  cancelPurchase,
  getAvailablePlans,
  getPurchaseStatus,
};
