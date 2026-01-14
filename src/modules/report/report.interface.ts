import { PlanType, SubscriptionStatus } from "../../../generated/prisma/client";

export interface SubscriptionOverview {
  totalClinics: number;
  activeSubscriptions: number;
  totalMRR: number;
  subscriptionsByStatus: Array<{
    status: SubscriptionStatus;
    count: number;
  }>;
  subscriptionsByPlan: Array<{
    planId: string;
    planName: string;
    planType: PlanType;
    planPrice: number;
    count: number;
  }>;
}

export interface ClientUsageReport {
  summary: {
    totalClients: number;
    clinicsAtLimit: number;
    clinicsNearLimit: number;
    averageClientsPerClinic: number;
  };
  clinics: Array<{
    clinicId: string;
    clinicName: string;
    clinicEmail: string | null;
    createdAt: Date;
    subscriptionStatus: SubscriptionStatus | 'none';
    planName: string;
    planType: PlanType | 'none';
    clientCount: number;
    clientLimit: string | number;
    usagePercentage: number;
    isAtLimit: boolean;
    isNearLimit: boolean;
  }>;
}

export interface TrialReport {
  summary: {
    activeTrials: number;
    expiringSoon: number;
    totalTrialsStarted: number;
    trialConversions: number;
    conversionRate: number;
  };
  trials: Array<{
    subscriptionId: string;
    clinicId: string;
    clinicName: string;
    clinicEmail: string | null;
    clinicCreatedAt: Date;
    planName: string;
    planType: PlanType;
    trialStart: Date | null;
    trialEnd: Date | null;
    daysRemaining: number;
    daysUsed: number;
    totalTrialDays: number;
    isExpiringSoon: boolean;
    isExpired: boolean;
  }>;
}

export interface RevenueReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalMRR: number;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    netGrowth: number;
  };
  mrrByPlan: Record<string, {
    count: number;
    revenue: number;
  }>;
  recentChanges: Array<{
    id: string;
    status: SubscriptionStatus;
    createdAt: Date;
    updatedAt: Date;
    plan: {
      name: string;
      type: PlanType;
      price: number;
    };
    clinic: {
      name: string;
      email: string | null;
    };
  }>;
}

export interface SystemHealthReport {
  systemStats: {
    totalUsers: number;
    activeUsers: number;
    totalClinics: number;
    totalClients: number;
    totalAppointments: number;
  };
  recentActivity: {
    newUsers: number;
    newClinics: number;
    newClients: number;
    newAppointments: number;
  };
  subscriptionHealth: {
    activeSubscriptions: number;
    totalMRR: number;
    pastDueSubscriptions: number;
    subscriptionsByStatus: Array<{
      status: SubscriptionStatus;
      count: number;
    }>;
  };
  healthIndicators: {
    restrictedUsers: number;
    pastDueSubscriptions: number;
    userActivationRate: number;
  };
}

export interface DashboardSummary {
  // Key metrics
  totalClinics: number;
  activeSubscriptions: number;
  totalMRR: number;
  totalClients: number;
  
  // Growth indicators
  recentActivity: {
    newUsers: number;
    newClinics: number;
    newClients: number;
    newAppointments: number;
  };
  
  // Attention needed
  trialsExpiringSoon: number;
  clinicsAtLimit: number;
  pastDueSubscriptions: number;
  
  // Conversion metrics
  trialConversionRate: number;
  
  // Plan distribution
  subscriptionsByPlan: Array<{
    planId: string;
    planName: string;
    planType: PlanType;
    planPrice: number;
    count: number;
  }>;
  
  // Health indicators
  healthScore: number;
}