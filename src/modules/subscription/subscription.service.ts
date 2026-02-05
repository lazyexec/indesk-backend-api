import { SubscriptionStatus, PlanType } from "@prisma/client";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import planService from "./plan.service";

const createSubscription = async (data: {
  clinicId: string;
  planId: string;
  status?: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialStart?: Date;
  trialEnd?: Date;
}) => {
  // Check if clinic already has a subscription
  const existingSubscription = await prisma.subscription.findUnique({
    where: { clinicId: data.clinicId }
  });

  if (existingSubscription) {
    throw new ApiError(httpStatus.CONFLICT, "Clinic already has a subscription");
  }

  // Verify clinic exists
  const clinic = await prisma.clinic.findUnique({
    where: { id: data.clinicId }
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  // Verify plan exists
  await planService.getPlanById(data.planId);

  return await prisma.subscription.create({
    data: {
      clinicId: data.clinicId,
      planId: data.planId,
      status: data.status || SubscriptionStatus.active,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      trialStart: data.trialStart,
      trialEnd: data.trialEnd,
    },
    include: {
      plan: true,
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });
};

const getSubscriptionByClinicId = async (clinicId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { clinicId },
    include: {
      plan: true,
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });

  if (!subscription) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subscription not found");
  }

  return subscription;
};

const getSubscriptionById = async (id: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      plan: true,
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });

  if (!subscription) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subscription not found");
  }

  return subscription;
};

const updateSubscription = async (id: string, data: {
  planId?: string;
  status?: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
}) => {
  // Check if subscription exists
  await getSubscriptionById(id);

  // If updating plan, verify new plan exists
  if (data.planId) {
    await planService.getPlanById(data.planId);
  }

  return await prisma.subscription.update({
    where: { id },
    data,
    include: {
      plan: true,
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });
};

const updateSubscriptionByClinicId = async (clinicId: string, data: {
  planId?: string;
  status?: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
}) => {
  const subscription = await getSubscriptionByClinicId(clinicId);
  return await updateSubscription(subscription.id, data);
};

const assignDefaultSubscription = async (clinicId: string) => {
  try {
    // Get the free plan
    const freePlan = await planService.getPlanByType(PlanType.free);

    // Create subscription with free plan
    return await createSubscription({
      clinicId,
      planId: freePlan.id,
      status: SubscriptionStatus.active,
    });
  } catch (error) {
    console.error('Failed to assign default subscription:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to assign default subscription");
  }
};

const cancelSubscription = async (clinicId: string) => {
  const subscription = await getSubscriptionByClinicId(clinicId);

  return await updateSubscription(subscription.id, {
    status: SubscriptionStatus.cancelled,
    cancelledAt: new Date(),
  });
};

const checkSubscriptionStatus = async (clinicId: string) => {
  try {
    const subscription = await getSubscriptionByClinicId(clinicId);

    // Check if trial has expired
    if (subscription.status === SubscriptionStatus.trialing && subscription.trialEnd) {
      if (new Date() > subscription.trialEnd) {
        // Trial expired, downgrade to free
        const freePlan = await planService.getPlanByType(PlanType.free);
        await updateSubscription(subscription.id, {
          planId: freePlan.id,
          status: SubscriptionStatus.active,
        });

        return await getSubscriptionById(subscription.id);
      }
    }

    return subscription;
  } catch (error) {
    // If no subscription found, assign default
    if (error instanceof ApiError && error.status === httpStatus.NOT_FOUND) {
      return await assignDefaultSubscription(clinicId);
    }
    throw error;
  }
};

const getAllSubscriptions = async (filter: any = {}, options: any = {}) => {
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;
  const { status, planType, ...restFilter } = filter;

  const where: any = {
    ...restFilter,
  };

  if (status) {
    where.status = status;
  }

  if (planType) {
    where.plan = {
      type: planType
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [subscriptions, totalDocs] = await Promise.all([
    prisma.subscription.findMany({
      where,
      take,
      skip,
      orderBy: sort,
      include: {
        plan: true,
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    }),
    prisma.subscription.count({ where }),
  ]);

  return {
    docs: subscriptions,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

export default {
  createSubscription,
  getSubscriptionByClinicId,
  getSubscriptionById,
  updateSubscription,
  updateSubscriptionByClinicId,
  assignDefaultSubscription,
  cancelSubscription,
  checkSubscriptionStatus,
  getAllSubscriptions,
};