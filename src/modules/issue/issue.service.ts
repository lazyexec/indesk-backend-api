import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { IssueType, IssuePriority, IssueStatus, UserIssue } from "@prisma/client";

interface CreateIssueData {
  title: string;
  description: string;
  type: IssueType;
  priority?: IssuePriority;
  clinicId?: string;
  browserInfo?: string;
  url?: string;
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  attachments?: string[];
}

interface UpdateIssueData {
  title?: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  status?: IssueStatus;
  adminResponse?: string;
  adminId?: string;
}

interface IssueFilters {
  status?: IssueStatus;
  type?: IssueType;
  priority?: IssuePriority;
  reporterId?: string;
  clinicId?: string;
  search?: string;
}

/**
 * Create a new issue report
 */
const createIssue = async (reporterId: string, data: CreateIssueData): Promise<UserIssue> => {
  // Validate reporter exists
  const reporter = await prisma.user.findUnique({
    where: { id: reporterId }
  });

  if (!reporter) {
    throw new ApiError(httpStatus.NOT_FOUND, "Reporter not found");
  }

  // If clinicId provided, validate it exists and user has access
  if (data.clinicId) {
    const clinic = await prisma.clinic.findFirst({
      where: {
        id: data.clinicId,
        OR: [
          { ownerId: reporterId },
          { members: { some: { userId: reporterId } } }
        ]
      }
    });

    if (!clinic) {
      throw new ApiError(httpStatus.FORBIDDEN, "No access to specified clinic");
    }
  }

  const issue = await prisma.userIssue.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      priority: data.priority || IssuePriority.medium,
      reporterId,
      clinicId: data.clinicId,
      browserInfo: data.browserInfo,
      url: data.url,
      steps: data.steps,
      expectedResult: data.expectedResult,
      actualResult: data.actualResult,
      attachments: data.attachments || []
    },
    include: {
      reporter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      clinic: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return issue;
};

/**
 * Get issues with filtering and pagination
 */
const getIssues = async (
  filters: IssueFilters = {},
  page: number = 1,
  limit: number = 10,
  isAdmin: boolean = false
) => {
  const skip = (page - 1) * limit;

  const where: any = {};

  // Apply filters
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.priority) where.priority = filters.priority;
  if (filters.reporterId) where.reporterId = filters.reporterId;
  if (filters.clinicId) where.clinicId = filters.clinicId;

  // Search functionality
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  // If not admin, only show user's own issues
  if (!isAdmin && filters.reporterId) {
    where.reporterId = filters.reporterId;
  }

  const [issues, total] = await Promise.all([
    prisma.userIssue.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        clinic: {
          select: {
            id: true,
            name: true
          }
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limit
    }),
    prisma.userIssue.count({ where })
  ]);

  return {
    issues,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get issue by ID
 */
const getIssueById = async (id: string, userId?: string, isAdmin: boolean = false): Promise<UserIssue> => {
  const issue = await prisma.userIssue.findUnique({
    where: { id },
    include: {
      reporter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      clinic: {
        select: {
          id: true,
          name: true
        }
      },
      admin: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  if (!issue) {
    throw new ApiError(httpStatus.NOT_FOUND, "Issue not found");
  }

  // Check access permissions
  if (!isAdmin && userId && issue.reporterId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  return issue;
};

/**
 * Update issue (for users to update their own issues or admins to respond)
 */
const updateIssue = async (
  id: string,
  data: UpdateIssueData,
  userId: string,
  isAdmin: boolean = false
): Promise<UserIssue> => {
  const existingIssue = await prisma.userIssue.findUnique({
    where: { id }
  });

  if (!existingIssue) {
    throw new ApiError(httpStatus.NOT_FOUND, "Issue not found");
  }

  // Check permissions
  if (!isAdmin && existingIssue.reporterId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  // Users can only update certain fields, admins can update all
  const updateData: any = {};

  if (isAdmin) {
    // Admins can update everything
    if (data.status !== undefined) updateData.status = data.status;
    if (data.adminResponse !== undefined) updateData.adminResponse = data.adminResponse;
    if (data.adminId !== undefined) updateData.adminId = data.adminId;
    if (data.priority !== undefined) updateData.priority = data.priority;

    // Mark as resolved if admin provides response and status is not set
    if (data.adminResponse && !data.status) {
      updateData.status = IssueStatus.resolved;
      updateData.resolvedAt = new Date();
    }
  } else {
    // Users can only update their own issues and only certain fields
    if (existingIssue.status === IssueStatus.open) {
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.priority !== undefined) updateData.priority = data.priority;
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, "Cannot update issue that is not open");
    }
  }

  const updatedIssue = await prisma.userIssue.update({
    where: { id },
    data: updateData,
    include: {
      reporter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      clinic: {
        select: {
          id: true,
          name: true
        }
      },
      admin: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  return updatedIssue;
};

/**
 * Delete issue (only by reporter or admin)
 */
const deleteIssue = async (id: string, userId: string, isAdmin: boolean = false): Promise<void> => {
  const issue = await prisma.userIssue.findUnique({
    where: { id }
  });

  if (!issue) {
    throw new ApiError(httpStatus.NOT_FOUND, "Issue not found");
  }

  // Check permissions
  if (!isAdmin && issue.reporterId !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  await prisma.userIssue.delete({
    where: { id }
  });
};

/**
 * Get issue statistics (for admin dashboard)
 */
const getIssueStats = async () => {
  const [
    totalIssues,
    openIssues,
    resolvedIssues,
    criticalIssues,
    issuesByType,
    recentIssues
  ] = await Promise.all([
    prisma.userIssue.count(),
    prisma.userIssue.count({ where: { status: IssueStatus.open } }),
    prisma.userIssue.count({ where: { status: IssueStatus.resolved } }),
    prisma.userIssue.count({ where: { priority: IssuePriority.critical } }),
    prisma.userIssue.groupBy({
      by: ['type'],
      _count: { type: true }
    }),
    prisma.userIssue.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    })
  ]);

  return {
    total: totalIssues,
    open: openIssues,
    resolved: resolvedIssues,
    critical: criticalIssues,
    recent: recentIssues,
    byType: issuesByType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>),
    resolutionRate: totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0
  };
};

export default {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  getIssueStats
};