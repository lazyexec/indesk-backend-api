import prisma from "../../configs/prisma";
import logger from "../../utils/logger";
import subscriptionService from "./subscription.service";
import planService from "./plan.service";
import { SubscriptionStatus, PlanType } from "../../../generated/prisma/client";

const processExpiredTrials = async () => {
  try {
    logger.info('🔄 Processing expired trials...');
    
    // Find all trialing subscriptions where trial has expired
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.trialing,
        trialEnd: {
          lt: new Date() // Trial end date is in the past
        }
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        plan: true,
      }
    });

    if (expiredTrials.length === 0) {
      logger.info('✅ No expired trials found');
      return { processed: 0, results: [] };
    }

    logger.info(`📋 Found ${expiredTrials.length} expired trials to process`);

    // Get the free plan to downgrade to
    const freePlan = await planService.getPlanByType(PlanType.free);
    
    const results = [];

    for (const subscription of expiredTrials) {
      try {
        // Downgrade to free plan
        const updatedSubscription = await subscriptionService.updateSubscription(subscription.id, {
          planId: freePlan.id,
          status: SubscriptionStatus.active,
          trialStart: undefined,
          trialEnd: undefined,
        });

        results.push({
          success: true,
          clinicId: subscription.clinicId,
          clinicName: subscription.clinic.name,
          previousPlan: subscription.plan.name,
          newPlan: freePlan.name,
        });

        logger.info(`✅ Downgraded clinic ${subscription.clinic.name} from trial to free plan`);
      } catch (error) {
        results.push({
          success: false,
          clinicId: subscription.clinicId,
          clinicName: subscription.clinic.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        logger.error(`❌ Failed to downgrade clinic ${subscription.clinic.name}:`, error);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info(`🎉 Trial processing completed: ${successCount} successful, ${failureCount} failed`);

    return {
      processed: expiredTrials.length,
      successful: successCount,
      failed: failureCount,
      results,
    };
  } catch (error) {
    logger.error('💥 Failed to process expired trials:', error);
    throw error;
  }
};

const checkTrialEligibility = async (clinicId: string) => {
  try {
    // Check if clinic has ever had a trial
    const subscription = await subscriptionService.getSubscriptionByClinicId(clinicId);
    
    // If they've never had trial dates, they're eligible
    const hasHadTrial = subscription.trialStart !== null || subscription.trialEnd !== null;
    
    return {
      eligible: !hasHadTrial,
      reason: hasHadTrial ? 'Trial already used' : null,
      currentStatus: subscription.status,
      currentPlan: subscription.plan.name,
    };
  } catch (error) {
    logger.error('Failed to check trial eligibility:', error);
    throw error;
  }
};

const getTrialStatus = async (clinicId: string) => {
  try {
    const subscription = await subscriptionService.getSubscriptionByClinicId(clinicId);
    
    if (subscription.status !== SubscriptionStatus.trialing) {
      return {
        isTrialing: false,
        trialStart: null,
        trialEnd: null,
        daysRemaining: 0,
        hasExpired: false,
      };
    }

    const now = new Date();
    const trialEnd = subscription.trialEnd;
    const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const hasExpired = trialEnd ? now > trialEnd : false;

    return {
      isTrialing: true,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      daysRemaining,
      hasExpired,
    };
  } catch (error) {
    logger.error('Failed to get trial status:', error);
    throw error;
  }
};

const startTrial = async (clinicId: string, durationDays: number = 14) => {
  try {
    // Check eligibility
    const eligibility = await checkTrialEligibility(clinicId);
    
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Not eligible for trial');
    }

    // Get professional plan
    const professionalPlan = await planService.getPlanByType(PlanType.professional);
    
    // Calculate trial dates
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + durationDays);

    // Update subscription
    const updatedSubscription = await subscriptionService.updateSubscriptionByClinicId(clinicId, {
      planId: professionalPlan.id,
      status: SubscriptionStatus.trialing,
      trialStart,
      trialEnd,
    });

    logger.info(`🎉 Started ${durationDays}-day trial for clinic ${clinicId}`);

    return updatedSubscription;
  } catch (error) {
    logger.error('Failed to start trial:', error);
    throw error;
  }
};

export default {
  processExpiredTrials,
  checkTrialEligibility,
  getTrialStatus,
  startTrial,
};