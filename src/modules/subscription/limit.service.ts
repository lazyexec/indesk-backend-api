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

export default {
  checkClientLimit,
  enforceClientLimit,
  getClientUsageStats,
};