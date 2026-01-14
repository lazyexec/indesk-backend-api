import { Request, Response } from "express";
import httpStatus from "http-status";
import issueService from "./issue.service";
import ApiError from "../../utils/ApiError";
import catchAsync from "../../utils/catchAsync";
import response from "../../utils/response";
import pick from "../../utils/pick";

interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Create a new issue report
 */
const createIssue = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const issueData = pick(req.body, [
    'title', 'description', 'type', 'priority', 'clinicId',
    'browserInfo', 'url', 'steps', 'expectedResult', 'actualResult', 'attachments'
  ]);

  const issue = await issueService.createIssue(req.user.id, issueData);

  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Issue reported successfully",
      data: issue
    })
  );
});

/**
 * Get issues with filtering and pagination
 */
const getIssues = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const filters: any = pick(req.query, ['status', 'type', 'priority', 'clinicId', 'search']);
  const { page, limit } = pick(req.query, ['page', 'limit']);
  
  const isAdmin = req.user.role === 'provider';
  
  // If not admin, only show user's own issues
  if (!isAdmin) {
    filters.reporterId = req.user.id;
  }

  const result = await issueService.getIssues(
    filters,
    parseInt(page as string) || 1,
    parseInt(limit as string) || 10,
    isAdmin
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Issues retrieved successfully",
      data: result.issues,
      pagination: result.pagination
    })
  );
});

/**
 * Get issue by ID
 */
const getIssue = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const { id } = req.params;
  const isAdmin = req.user.role === 'provider';

  const issue = await issueService.getIssueById(id, req.user.id, isAdmin);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Issue retrieved successfully",
      data: issue
    })
  );
});

/**
 * Update issue
 */
const updateIssue = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const { id } = req.params;
  const updateData: any = pick(req.body, [
    'title', 'description', 'type', 'priority', 'status', 'adminResponse'
  ]);
  
  const isAdmin = req.user.role === 'provider';
  
  // If admin is providing response, set adminId
  if (isAdmin && updateData.adminResponse) {
    updateData.adminId = req.user.id;
  }

  const issue = await issueService.updateIssue(id, updateData, req.user.id, isAdmin);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Issue updated successfully",
      data: issue
    })
  );
});

/**
 * Delete issue
 */
const deleteIssue = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const { id } = req.params;
  const isAdmin = req.user.role === 'provider';

  await issueService.deleteIssue(id, req.user.id, isAdmin);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Issue deleted successfully"
    })
  );
});

/**
 * Get issue statistics (admin only)
 */
const getIssueStats = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  if (req.user.role !== 'provider') {
    throw new ApiError(httpStatus.FORBIDDEN, "Admin access required");
  }

  const stats = await issueService.getIssueStats();

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Issue statistics retrieved successfully",
      data: stats
    })
  );
});

/**
 * Get user's own issues summary
 */
const getMyIssuesSummary = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const result = await issueService.getIssues(
    { reporterId: req.user.id },
    1,
    5, // Just get recent 5 issues
    false
  );

  // Get counts by status
  const allUserIssues = await issueService.getIssues(
    { reporterId: req.user.id },
    1,
    1000, // Get all to count
    false
  );

  const summary = {
    recentIssues: result.issues,
    counts: {
      total: allUserIssues.pagination.total,
      open: allUserIssues.issues.filter(i => i.status === 'open').length,
      resolved: allUserIssues.issues.filter(i => i.status === 'resolved').length,
      inProgress: allUserIssues.issues.filter(i => i.status === 'in_progress').length
    }
  };

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Issues summary retrieved successfully",
      data: summary
    })
  );
});

export default {
  createIssue,
  getIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  getIssueStats,
  getMyIssuesSummary
};