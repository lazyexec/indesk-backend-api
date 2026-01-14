import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import dashboardService from "./dashboard.service";
import response from "../../utils/response";
import pick from "../../utils/pick";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";

/**
 * Get comprehensive dashboard overview
 */
const getDashboardOverview = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  
  // Get clinic ID from user
  const clinicMember = await prisma.clinicMember.findFirst({
    where: { userId },
    select: { clinicId: true },
  });

  const ownedClinic = await prisma.clinic.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  const clinicId = ownedClinic?.id || clinicMember?.clinicId;

  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "No clinic association found");
  }

  const filter = pick(req.query, ["startDate", "endDate"]);
  
  const dashboardData = await dashboardService.getDashboardOverview(clinicId, filter);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Dashboard overview retrieved successfully",
      data: dashboardData,
    })
  );
});

/**
 * Get dashboard calendar view
 */
const getDashboardCalendar = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  
  // Get clinic ID from user
  const clinicMember = await prisma.clinicMember.findFirst({
    where: { userId },
    select: { clinicId: true },
  });

  const ownedClinic = await prisma.clinic.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  const clinicId = ownedClinic?.id || clinicMember?.clinicId;

  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "No clinic association found");
  }

  const filter = pick(req.query, ["startDate", "endDate", "view"]);
  
  const calendarData = await dashboardService.getDashboardCalendar(clinicId, filter);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Dashboard calendar retrieved successfully",
      data: calendarData,
    })
  );
});

/**
 * Get clinician personal dashboard
 */
const getClinicianDashboard = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  
  // Get clinician ID from user
  const clinicMember = await prisma.clinicMember.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!clinicMember) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinician not found");
  }

  const filter = pick(req.query, ["startDate", "endDate"]);
  
  const dashboardData = await dashboardService.getClinicianDashboard(clinicMember.id, filter);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinician dashboard retrieved successfully",
      data: dashboardData,
    })
  );
});

/**
 * Get quick dashboard stats
 */
const getQuickStats = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  
  // Get clinic ID from user
  const clinicMember = await prisma.clinicMember.findFirst({
    where: { userId },
    select: { clinicId: true },
  });

  const ownedClinic = await prisma.clinic.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  const clinicId = ownedClinic?.id || clinicMember?.clinicId;

  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "No clinic association found");
  }
  
  const stats = await dashboardService.getQuickStats(clinicId);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Quick stats retrieved successfully",
      data: stats,
    })
  );
});

/**
 * Get dashboard data for specific clinic member (admin only)
 */
const getClinicMemberDashboard = catchAsync(async (req: Request, res: Response) => {
  const { clinicMemberId } = req.params;
  const filter = pick(req.query, ["startDate", "endDate"]);
  
  // Verify the clinic member exists and user has access
  const clinicMember = await prisma.clinicMember.findUnique({
    where: { id: clinicMemberId },
    select: { 
      id: true,
      clinicId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        }
      }
    },
  });

  if (!clinicMember) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic member not found");
  }

  // Check if requesting user has access to this clinic
  const userId: string = req.user?.id!;
  const requestingUserClinic = await prisma.clinicMember.findFirst({
    where: { userId },
    select: { clinicId: true, role: true },
  });

  const ownedClinic = await prisma.clinic.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  const userClinicId = ownedClinic?.id || requestingUserClinic?.clinicId;

  if (userClinicId !== clinicMember.clinicId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied to this clinic member's data");
  }

  // Only allow admins and owners to view other members' dashboards
  if (!ownedClinic && requestingUserClinic?.role !== 'admin' && requestingUserClinic?.role !== 'superAdmin') {
    throw new ApiError(httpStatus.FORBIDDEN, "Insufficient permissions to view this dashboard");
  }
  
  const dashboardData = await dashboardService.getClinicianDashboard(clinicMemberId, filter);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: `Dashboard for ${clinicMember.user.firstName} ${clinicMember.user.lastName} retrieved successfully`,
      data: dashboardData,
    })
  );
});

export default {
  getDashboardOverview,
  getDashboardCalendar,
  getClinicianDashboard,
  getQuickStats,
  getClinicMemberDashboard,
};