import { Request, Response } from "express";
import httpStatus from "http-status";
import analyticsService from "./analytics.service";
import ApiError from "../../utils/ApiError";
import catchAsync from "../../utils/catchAsync";
import response from "../../utils/response";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Helper function to determine if user should see all clinics or just their own
const getAnalyticsScope = (user: any) => {
  // Provider role can see all clinics
  if (user.role === 'provider') {
    return { isProvider: true, clinicId: null };
  }
  
  // Clinic owners/members can only see their clinic
  if (user.clinicId) {
    return { isProvider: false, clinicId: user.clinicId };
  }
  
  throw new ApiError(httpStatus.FORBIDDEN, "No analytics access permissions");
};

const getFinancialOverview = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const scope = getAnalyticsScope(req.user);
  const months = parseInt(req.query.months as string) || 6;
  
  if (months < 1 || months > 24) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Months must be between 1 and 24");
  }

  let overview;
  if (scope.isProvider) {
    // Provider sees aggregated data across all clinics
    overview = await analyticsService.getProviderFinancialOverview(months);
  } else {
    // Clinic owner/member sees only their clinic
    overview = await analyticsService.getFinancialOverview(scope.clinicId!, months);
  }
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Financial overview retrieved successfully",
      data: {
        ...overview,
        scope: scope.isProvider ? 'all_clinics' : 'single_clinic'
      }
    })
  );
});

const getIncomeSourcesBreakdown = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const scope = getAnalyticsScope(req.user);
  const months = parseInt(req.query.months as string) || 6;
  
  if (months < 1 || months > 24) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Months must be between 1 and 24");
  }

  let breakdown;
  if (scope.isProvider) {
    breakdown = await analyticsService.getProviderIncomeSourcesBreakdown(months);
  } else {
    breakdown = await analyticsService.getIncomeSourcesBreakdown(scope.clinicId!, months);
  }
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Income sources breakdown retrieved successfully",
      data: {
        ...breakdown,
        scope: scope.isProvider ? 'all_clinics' : 'single_clinic'
      }
    })
  );
});

const getSessionTypeDistribution = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const scope = getAnalyticsScope(req.user);
  const months = parseInt(req.query.months as string) || 6;
  
  if (months < 1 || months > 24) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Months must be between 1 and 24");
  }

  let distribution;
  if (scope.isProvider) {
    distribution = await analyticsService.getProviderSessionTypeDistribution(months);
  } else {
    distribution = await analyticsService.getSessionTypeDistribution(scope.clinicId!, months);
  }
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Session type distribution retrieved successfully",
      data: {
        ...distribution,
        scope: scope.isProvider ? 'all_clinics' : 'single_clinic'
      }
    })
  );
});

const getClientGrowthAnalysis = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const scope = getAnalyticsScope(req.user);
  const months = parseInt(req.query.months as string) || 6;
  
  if (months < 1 || months > 24) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Months must be between 1 and 24");
  }

  let analysis;
  if (scope.isProvider) {
    analysis = await analyticsService.getProviderClientGrowthAnalysis(months);
  } else {
    analysis = await analyticsService.getClientGrowthAnalysis(scope.clinicId!, months);
  }
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Client growth analysis retrieved successfully",
      data: {
        ...analysis,
        scope: scope.isProvider ? 'all_clinics' : 'single_clinic'
      }
    })
  );
});

const getExpensesAnalysis = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const scope = getAnalyticsScope(req.user);
  const months = parseInt(req.query.months as string) || 6;
  
  if (months < 1 || months > 24) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Months must be between 1 and 24");
  }

  let expenses;
  if (scope.isProvider) {
    expenses = await analyticsService.getProviderExpensesAnalysis(months);
  } else {
    expenses = await analyticsService.getExpensesAnalysis(scope.clinicId!, months);
  }
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Expenses analysis retrieved successfully",
      data: {
        ...expenses,
        scope: scope.isProvider ? 'all_clinics' : 'single_clinic'
      }
    })
  );
});

const getComprehensiveAnalytics = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const scope = getAnalyticsScope(req.user);
  const months = parseInt(req.query.months as string) || 6;
  
  if (months < 1 || months > 24) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Months must be between 1 and 24");
  }

  let analytics;
  if (scope.isProvider) {
    analytics = await analyticsService.getProviderComprehensiveAnalytics(months);
  } else {
    analytics = await analyticsService.getComprehensiveAnalytics(scope.clinicId!, months);
  }
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Comprehensive analytics retrieved successfully",
      data: {
        ...analytics,
        scope: scope.isProvider ? 'all_clinics' : 'single_clinic'
      }
    })
  );
});

const exportReport = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const scope = getAnalyticsScope(req.user);
  const months = parseInt(req.query.months as string) || 6;
  const format = req.query.format as string || 'json';
  
  if (months < 1 || months > 24) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Months must be between 1 and 24");
  }

  if (!['json', 'csv'].includes(format)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Format must be 'json' or 'csv'");
  }

  let analytics;
  if (scope.isProvider) {
    analytics = await analyticsService.getProviderComprehensiveAnalytics(months);
  } else {
    analytics = await analyticsService.getComprehensiveAnalytics(scope.clinicId!, months);
  }
  
  const filename = scope.isProvider 
    ? `provider-financial-report-${months}months`
    : `clinic-financial-report-${months}months`;
  
  if (format === 'csv') {
    // Convert to CSV format
    const csvData = convertToCSV(analytics, scope.isProvider);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csvData);
  } else {
    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Report exported successfully",
        data: {
          ...analytics,
          scope: scope.isProvider ? 'all_clinics' : 'single_clinic',
          exportedAt: new Date().toISOString()
        }
      })
    );
  }
});

// Helper function to convert analytics data to CSV
const convertToCSV = (analytics: any, isProvider: boolean): string => {
  const lines: string[] = [];
  
  // Header
  lines.push(isProvider ? 'Provider Financial Analytics Report' : 'Clinic Financial Analytics Report');
  lines.push(`Period: ${analytics.period.months} months`);
  lines.push(`Scope: ${isProvider ? 'All Clinics' : 'Single Clinic'}`);
  lines.push('');
  
  // Financial Overview
  lines.push('Financial Overview');
  lines.push('Metric,Value');
  lines.push(`Total Income,$${analytics.financial.totalIncome.toFixed(2)}`);
  lines.push(`Average Revenue,$${analytics.financial.avgRevenue.toFixed(2)}`);
  lines.push(`Growth Rate,${analytics.financial.growthRate.toFixed(2)}%`);
  lines.push(`Outstanding,$${analytics.financial.outstanding.toFixed(2)}`);
  lines.push('');
  
  // Monthly Revenue
  lines.push('Monthly Revenue');
  lines.push('Month,Revenue,Appointments');
  analytics.financial.monthlyRevenue.forEach((month: any) => {
    lines.push(`${month.month} ${month.year},$${month.revenue.toFixed(2)},${month.appointmentCount}`);
  });
  lines.push('');
  
  // Income Sources
  lines.push('Income Sources');
  lines.push('Source,Revenue,Sessions,Percentage');
  analytics.incomeSources.sources.forEach((source: any) => {
    lines.push(`${source.name},$${source.revenue.toFixed(2)},${source.count},${source.percentage.toFixed(1)}%`);
  });
  lines.push('');
  
  // Session Distribution
  lines.push('Session Type Distribution');
  lines.push('Type,Count,Percentage');
  Object.entries(analytics.sessionDistribution.distribution).forEach(([type, data]: [string, any]) => {
    lines.push(`${type},${data.count},${data.percentage.toFixed(1)}%`);
  });
  
  return lines.join('\n');
};

export default {
  getFinancialOverview,
  getIncomeSourcesBreakdown,
  getSessionTypeDistribution,
  getClientGrowthAnalysis,
  getExpensesAnalysis,
  getComprehensiveAnalytics,
  exportReport,
};