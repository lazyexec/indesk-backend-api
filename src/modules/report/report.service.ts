import prisma from "../../configs/prisma";
import { PlanType, SubscriptionStatus } from "@prisma/client";

const getSubscriptionOverview = async () => {
  // Get subscription counts by status
  const subscriptionsByStatus = await prisma.subscription.groupBy({
    by: ['status'],
    _count: {
      id: true
    }
  });

  // Get subscription counts by plan type
  const subscriptionsByPlan = await prisma.subscription.groupBy({
    by: ['planId'],
    _count: {
      id: true
    }
  });

  // Get plan details for the groupBy result
  const planDetails = await prisma.plan.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      price: true
    }
  });

  // Map plan details to subscription counts
  const subscriptionsByPlanWithDetails = subscriptionsByPlan.map(sub => {
    const plan = planDetails.find(p => p.id === sub.planId);
    return {
      planId: sub.planId,
      planName: plan?.name || 'Unknown',
      planType: plan?.type || 'unknown',
      planPrice: plan?.price || 0,
      count: sub._count.id
    };
  });

  // Calculate total revenue (monthly recurring revenue)
  const totalMRR = subscriptionsByPlanWithDetails.reduce((total, sub) => {
    return total + (sub.planPrice * sub.count);
  }, 0);

  // Get total clinics
  const totalClinics = await prisma.clinic.count();

  // Get total active subscriptions
  const activeSubscriptions = await prisma.subscription.count({
    where: {
      status: {
        in: [SubscriptionStatus.active, SubscriptionStatus.trialing]
      }
    }
  });

  return {
    totalClinics,
    activeSubscriptions,
    totalMRR,
    subscriptionsByStatus: subscriptionsByStatus.map(s => ({
      status: s.status,
      count: s._count.id
    })),
    subscriptionsByPlan: subscriptionsByPlanWithDetails
  };
};

const getClientUsageReport = async () => {
  // Get client counts by clinic with subscription info
  const clinicsWithClientCounts = await prisma.clinic.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          plan: {
            select: {
              name: true,
              type: true,
              clientLimit: true
            }
          }
        }
      },
      _count: {
        select: {
          clients: {
            where: {
              status: {
                not: 'inactive'
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Calculate usage statistics
  const usageStats = clinicsWithClientCounts.map(clinic => {
    const clientCount = clinic._count.clients;
    const clientLimit = clinic.subscription?.plan.clientLimit || 0;
    const isUnlimited = clientLimit === 0;
    const usagePercentage = isUnlimited ? 0 : (clientCount / clientLimit) * 100;

    return {
      clinicId: clinic.id,
      clinicName: clinic.name,
      clinicEmail: clinic.email,
      createdAt: clinic.createdAt,
      subscriptionStatus: clinic.subscription?.status || 'none',
      planName: clinic.subscription?.plan.name || 'No Plan',
      planType: clinic.subscription?.plan.type || 'none',
      clientCount,
      clientLimit: isUnlimited ? 'Unlimited' : clientLimit,
      usagePercentage: Math.round(usagePercentage),
      isAtLimit: !isUnlimited && clientCount >= clientLimit,
      isNearLimit: !isUnlimited && usagePercentage >= 80
    };
  });

  // Summary statistics
  const totalClients = usageStats.reduce((sum, stat) => sum + stat.clientCount, 0);
  const clinicsAtLimit = usageStats.filter(stat => stat.isAtLimit).length;
  const clinicsNearLimit = usageStats.filter(stat => stat.isNearLimit).length;
  const averageClientsPerClinic = usageStats.length > 0 ? Math.round(totalClients / usageStats.length) : 0;

  return {
    summary: {
      totalClients,
      clinicsAtLimit,
      clinicsNearLimit,
      averageClientsPerClinic
    },
    clinics: usageStats
  };
};

const getTrialReport = async () => {
  // Get current trials
  const activeTrials = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.trialing
    },
    select: {
      id: true,
      trialStart: true,
      trialEnd: true,
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      },
      plan: {
        select: {
          name: true,
          type: true
        }
      }
    },
    orderBy: {
      trialEnd: 'asc'
    }
  });

  // Calculate trial statistics
  const now = new Date();
  const trialsWithStats = activeTrials.map(trial => {
    const daysRemaining = trial.trialEnd ?
      Math.max(0, Math.ceil((trial.trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const totalTrialDays = trial.trialStart && trial.trialEnd ?
      Math.ceil((trial.trialEnd.getTime() - trial.trialStart.getTime()) / (1000 * 60 * 60 * 24)) : 14;
    const daysUsed = totalTrialDays - daysRemaining;

    return {
      subscriptionId: trial.id,
      clinicId: trial.clinic.id,
      clinicName: trial.clinic.name,
      clinicEmail: trial.clinic.email,
      clinicCreatedAt: trial.clinic.createdAt,
      planName: trial.plan.name,
      planType: trial.plan.type,
      trialStart: trial.trialStart,
      trialEnd: trial.trialEnd,
      daysRemaining,
      daysUsed,
      totalTrialDays,
      isExpiringSoon: daysRemaining <= 3,
      isExpired: daysRemaining === 0
    };
  });

  // Get trial conversion statistics (trials that became paid subscriptions)
  const trialConversions = await prisma.subscription.count({
    where: {
      AND: [
        { trialStart: { not: null } },
        { trialEnd: { not: null } },
        { status: SubscriptionStatus.active },
        { plan: { type: { not: PlanType.free } } }
      ]
    }
  });

  // Get total trials ever started
  const totalTrialsStarted = await prisma.subscription.count({
    where: {
      trialStart: { not: null }
    }
  });

  const conversionRate = totalTrialsStarted > 0 ?
    Math.round((trialConversions / totalTrialsStarted) * 100) : 0;

  return {
    summary: {
      activeTrials: activeTrials.length,
      expiringSoon: trialsWithStats.filter(t => t.isExpiringSoon).length,
      totalTrialsStarted,
      trialConversions,
      conversionRate
    },
    trials: trialsWithStats
  };
};

const getRevenueReport = async (startDate?: Date, endDate?: Date) => {
  // Default to last 30 days if no dates provided
  const end = endDate || new Date();
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get subscription changes in date range
  const subscriptionChanges = await prisma.subscription.findMany({
    where: {
      OR: [
        { createdAt: { gte: start, lte: end } },
        { updatedAt: { gte: start, lte: end } }
      ]
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      plan: {
        select: {
          name: true,
          type: true,
          price: true
        }
      },
      clinic: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  // Calculate current MRR by plan
  const currentMRR = await prisma.subscription.findMany({
    where: {
      status: {
        in: [SubscriptionStatus.active, SubscriptionStatus.trialing]
      }
    },
    select: {
      plan: {
        select: {
          type: true,
          price: true
        }
      }
    }
  });

  const mrrByPlan = currentMRR.reduce((acc, sub) => {
    const planType = sub.plan.type;
    if (!acc[planType]) {
      acc[planType] = { count: 0, revenue: 0 };
    }
    acc[planType].count += 1;
    acc[planType].revenue += sub.plan.price;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const totalMRR = Object.values(mrrByPlan).reduce((sum, plan) => sum + plan.revenue, 0);

  // Get new subscriptions in period
  const newSubscriptions = subscriptionChanges.filter(sub =>
    sub.createdAt >= start && sub.createdAt <= end
  ).length;

  // Get cancelled subscriptions in period
  const cancelledSubscriptions = await prisma.subscription.count({
    where: {
      status: SubscriptionStatus.cancelled,
      cancelledAt: { gte: start, lte: end }
    }
  });

  return {
    period: {
      startDate: start,
      endDate: end
    },
    summary: {
      totalMRR,
      newSubscriptions,
      cancelledSubscriptions,
      netGrowth: newSubscriptions - cancelledSubscriptions
    },
    mrrByPlan,
    recentChanges: subscriptionChanges.slice(0, 20) // Last 20 changes
  };
};

const getSystemHealthReport = async () => {
  // Get database counts
  const totalUsers = await prisma.user.count();
  const activeUsers = await prisma.user.count({
    where: {
      isDeleted: false,
      isRestricted: false
    }
  });

  const totalClinics = await prisma.clinic.count();
  const totalClients = await prisma.client.count();
  const totalAppointments = await prisma.appointment.count();

  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentUsers = await prisma.user.count({
    where: { createdAt: { gte: sevenDaysAgo } }
  });

  const recentClinics = await prisma.clinic.count({
    where: { createdAt: { gte: sevenDaysAgo } }
  });

  const recentClients = await prisma.client.count({
    where: { createdAt: { gte: sevenDaysAgo } }
  });

  const recentAppointments = await prisma.appointment.count({
    where: { createdAt: { gte: sevenDaysAgo } }
  });

  // Get subscription health
  const subscriptionHealth = await getSubscriptionOverview();

  // Get error indicators
  const pastDueSubscriptions = await prisma.subscription.count({
    where: { status: SubscriptionStatus.past_due }
  });

  const restrictedUsers = await prisma.user.count({
    where: { isRestricted: true }
  });

  return {
    systemStats: {
      totalUsers,
      activeUsers,
      totalClinics,
      totalClients,
      totalAppointments
    },
    recentActivity: {
      newUsers: recentUsers,
      newClinics: recentClinics,
      newClients: recentClients,
      newAppointments: recentAppointments
    },
    subscriptionHealth: {
      activeSubscriptions: subscriptionHealth.activeSubscriptions,
      totalMRR: subscriptionHealth.totalMRR,
      pastDueSubscriptions,
      subscriptionsByStatus: subscriptionHealth.subscriptionsByStatus
    },
    healthIndicators: {
      restrictedUsers,
      pastDueSubscriptions,
      userActivationRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
    }
  };
};

export default {
  getSubscriptionOverview,
  getClientUsageReport,
  getTrialReport,
  getRevenueReport,
  getSystemHealthReport,
};