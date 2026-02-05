import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import subscriptionService from "./subscription.service";

const checkClientLimit = async (clinicId: string): Promise<{
  canAddClient: boolean;
  currentCount: number;
  limit: number;
  isUnlimited: boolean;
}> => {
  // Get current subscription and plan
  const subscription = await subscriptionService.checkSubscriptionStatus(clinicId);

  // Get current client count
  const currentCount = await prisma.client.count({
    where: {
      clinicId,
      status: { not: 'inactive' } // Only count active and pending clients
    }
  });

  const limit = subscription.plan.clientLimit;
  const isUnlimited = limit === 0;
  const canAddClient = isUnlimited || currentCount < limit;

  return {
    canAddClient,
    currentCount,
    limit,
    isUnlimited,
  };
};

const enforceClientLimit = async (clinicId: string) => {
  const limitCheck = await checkClientLimit(clinicId);

  if (!limitCheck.canAddClient) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Client limit reached. Your ${limitCheck.isUnlimited ? 'current plan' : `plan allows ${limitCheck.limit} clients`} and you currently have ${limitCheck.currentCount} clients. Please upgrade your plan to add more clients.`
    );
  }

  return limitCheck;
};

const checkClinicianLimit = async (clinicId: string): Promise<{
  canAddClinician: boolean;
  currentCount: number;
  limit: number;
  isUnlimited: boolean;
}> => {
  // Get current subscription and plan
  const subscription = await subscriptionService.checkSubscriptionStatus(clinicId);

  // Get current clinician count (clinic members who are clinicians or admins)
  const currentCount = await prisma.clinicMember.count({
    where: {
      clinicId,
      role: { in: ['clinician', 'admin', 'superAdmin'] }
    }
  });

  const limit = subscription.plan.clinicianLimit;
  const isUnlimited = limit === 0;
  const canAddClinician = isUnlimited || currentCount < limit;

  return {
    canAddClinician,
    currentCount,
    limit,
    isUnlimited,
  };
};

const enforceClinicianLimit = async (clinicId: string) => {
  const limitCheck = await checkClinicianLimit(clinicId);

  if (!limitCheck.canAddClinician) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Clinician limit reached. Your ${limitCheck.isUnlimited ? 'current plan' : `plan allows ${limitCheck.limit} clinicians`} and you currently have ${limitCheck.currentCount} clinicians. Please upgrade your plan to add more clinicians.`
    );
  }

  return limitCheck;
};

const getClientUsageStats = async (clinicId: string) => {
  const limitCheck = await checkClientLimit(clinicId);
  const subscription = await subscriptionService.getSubscriptionByClinicId(clinicId);

  return {
    ...limitCheck,
    planName: subscription.plan.name,
    planType: subscription.plan.type,
    subscriptionStatus: subscription.status,
  };
};

const getClinicianUsageStats = async (clinicId: string) => {
  const limitCheck = await checkClinicianLimit(clinicId);
  const subscription = await subscriptionService.getSubscriptionByClinicId(clinicId);

  return {
    ...limitCheck,
    planName: subscription.plan.name,
    planType: subscription.plan.type,
    subscriptionStatus: subscription.status,
  };
};

const getUsageStats = async (clinicId: string) => {
  const [clientStats, clinicianStats, subscription] = await Promise.all([
    checkClientLimit(clinicId),
    checkClinicianLimit(clinicId),
    subscriptionService.getSubscriptionByClinicId(clinicId),
  ]);

  return {
    clients: clientStats,
    clinicians: clinicianStats,
    plan: {
      name: subscription.plan.name,
      type: subscription.plan.type,
      price: subscription.plan.price,
    },
    subscription: {
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd,
    },
  };
};

export default {
  checkClientLimit,
  enforceClientLimit,
  checkClinicianLimit,
  enforceClinicianLimit,
  getClientUsageStats,
  getClinicianUsageStats,
  getUsageStats,
};