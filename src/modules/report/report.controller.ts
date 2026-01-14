import { Request, Response } from "express";
import httpStatus from "http-status";
import reportService from "./report.service";
import ApiError from "../../utils/ApiError";
import catchAsync from "../../utils/catchAsync";
import response from "../../utils/response";

interface AuthenticatedRequest extends Request {
  user?: any;
}

const getSubscriptionOverview = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const overview = await reportService.getSubscriptionOverview();
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Subscription overview retrieved successfully",
      data: overview
    })
  );
});

const getClientUsageReport = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const report = await reportService.getClientUsageReport();
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Client usage report retrieved successfully",
      data: report
    })
  );
});

const getTrialReport = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const report = await reportService.getTrialReport();
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Trial report retrieved successfully",
      data: report
    })
  );
});

const getRevenueReport = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  
  let start: Date | undefined;
  let end: Date | undefined;
  
  if (startDate && typeof startDate === 'string') {
    start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid start date format");
    }
  }
  
  if (endDate && typeof endDate === 'string') {
    end = new Date(endDate);
    if (isNaN(end.getTime())) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid end date format");
    }
  }
  
  if (start && end && start > end) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Start date must be before end date");
  }
  
  const report = await reportService.getRevenueReport(start, end);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Revenue report retrieved successfully",
      data: report
    })
  );
});

const getSystemHealthReport = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const report = await reportService.getSystemHealthReport();
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "System health report retrieved successfully",
      data: report
    })
  );
});

const getDashboardSummary = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  // Get key metrics for admin dashboard
  const [subscriptionOverview, clientUsage, trialReport, systemHealth] = await Promise.all([
    reportService.getSubscriptionOverview(),
    reportService.getClientUsageReport(),
    reportService.getTrialReport(),
    reportService.getSystemHealthReport()
  ]);

  const summary = {
    // Key metrics
    totalClinics: subscriptionOverview.totalClinics,
    activeSubscriptions: subscriptionOverview.activeSubscriptions,
    totalMRR: subscriptionOverview.totalMRR,
    totalClients: clientUsage.summary.totalClients,
    
    // Growth indicators
    recentActivity: systemHealth.recentActivity,
    
    // Attention needed
    trialsExpiringSoon: trialReport.summary.expiringSoon,
    clinicsAtLimit: clientUsage.summary.clinicsAtLimit,
    pastDueSubscriptions: systemHealth.subscriptionHealth.pastDueSubscriptions,
    
    // Conversion metrics
    trialConversionRate: trialReport.summary.conversionRate,
    
    // Plan distribution
    subscriptionsByPlan: subscriptionOverview.subscriptionsByPlan,
    
    // Health indicators
    healthScore: calculateHealthScore(systemHealth, trialReport, clientUsage)
  };
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Dashboard summary retrieved successfully",
      data: summary
    })
  );
});

// Helper function to calculate overall system health score
const calculateHealthScore = (systemHealth: any, trialReport: any, clientUsage: any): number => {
  let score = 100;
  
  // Deduct points for issues
  if (systemHealth.healthIndicators.pastDueSubscriptions > 0) {
    score -= Math.min(20, systemHealth.healthIndicators.pastDueSubscriptions * 2);
  }
  
  if (systemHealth.healthIndicators.restrictedUsers > 0) {
    score -= Math.min(10, systemHealth.healthIndicators.restrictedUsers);
  }
  
  if (trialReport.summary.conversionRate < 20) {
    score -= 15; // Low trial conversion rate
  }
  
  if (clientUsage.summary.clinicsAtLimit > clientUsage.summary.totalClients * 0.1) {
    score -= 10; // Too many clinics at their limits
  }
  
  // Bonus points for good metrics
  if (trialReport.summary.conversionRate > 50) {
    score += 5; // High conversion rate
  }
  
  if (systemHealth.healthIndicators.userActivationRate > 90) {
    score += 5; // High user activation
  }
  
  return Math.max(0, Math.min(100, score));
};

export default {
  getSubscriptionOverview,
  getClientUsageReport,
  getTrialReport,
  getRevenueReport,
  getSystemHealthReport,
  getDashboardSummary,
};