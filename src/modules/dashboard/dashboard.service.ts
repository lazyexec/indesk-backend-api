import prisma from "../../configs/prisma";
import { AppointmentStatus, SubscriptionStatus } from "../../../generated/prisma/client";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

/**
 * Get comprehensive dashboard overview for clinic
 * @param {string} clinicId
 * @param {any} filter
 * @returns {Promise<any>}
 */
const getDashboardOverview = async (clinicId: string, filter: any) => {
  const { startDate, endDate } = filter;
  
  // Default to current month if no dates provided
  let dateRange: { gte: Date; lte: Date };
  
  if (startDate && endDate) {
    dateRange = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  } else {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    dateRange = {
      gte: startOfMonth,
      lte: endOfMonth,
    };
  }

  // Get all dashboard metrics in parallel
  const [
    // Appointment metrics
    totalAppointments,
    completedAppointments,
    pendingAppointments,
    cancelledAppointments,
    upcomingAppointments,
    todayAppointments,
    
    // Client metrics
    totalClients,
    activeClients,
    newClientsThisMonth,
    
    // Revenue metrics
    totalRevenue,
    pendingRevenue,
    
    // Clinic metrics
    totalClinicians,
    activeClinicians,
    
    // Recent appointments
    recentAppointments,
    
    // Subscription info
    subscriptionInfo,
  ] = await Promise.all([
    // Appointment queries
    prisma.appointment.count({
      where: { clinicId, startTime: dateRange }
    }),
    prisma.appointment.count({
      where: { clinicId, startTime: dateRange, status: AppointmentStatus.completed }
    }),
    prisma.appointment.count({
      where: { clinicId, startTime: dateRange, status: AppointmentStatus.pending }
    }),
    prisma.appointment.count({
      where: { clinicId, startTime: dateRange, status: AppointmentStatus.cancelled }
    }),
    prisma.appointment.count({
      where: { 
        clinicId, 
        status: { in: [AppointmentStatus.pending, AppointmentStatus.scheduled] },
        startTime: { gte: new Date() }
      }
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    }),
    
    // Client queries
    prisma.client.count({
      where: { clinicId }
    }),
    prisma.client.count({
      where: { clinicId, status: 'active' }
    }),
    prisma.client.count({
      where: { 
        clinicId, 
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    
    // Revenue queries
    prisma.appointment.findMany({
      where: { 
        clinicId,
        startTime: dateRange,
        transaction: {
          status: 'completed'
        }
      },
      include: {
        transaction: {
          select: {
            amount: true
          }
        }
      }
    }).then(appointments => {
      const total = appointments.reduce((sum, apt) => sum + (apt.transaction?.amount || 0), 0);
      return { _sum: { amount: total } };
    }),
    prisma.appointment.findMany({
      where: { 
        clinicId,
        startTime: dateRange,
        transaction: {
          status: 'pending'
        }
      },
      include: {
        transaction: {
          select: {
            amount: true
          }
        }
      }
    }).then(appointments => {
      const total = appointments.reduce((sum, apt) => sum + (apt.transaction?.amount || 0), 0);
      return { _sum: { amount: total } };
    }),
    
    // Clinic staff queries
    prisma.clinicMember.count({
      where: { clinicId }
    }),
    prisma.clinicMember.count({
      where: { 
        clinicId,
        user: { isOnline: true }
      }
    }),
    
    // Recent appointments
    prisma.appointment.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        session: {
          select: {
            name: true,
            duration: true,
            price: true,
          }
        },
        clinician: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              }
            }
          }
        }
      }
    }),
    
    // Subscription info
    prisma.subscription.findFirst({
      where: { clinicId },
      include: {
        plan: {
          select: {
            name: true,
            features: true,
            clientLimit: true,
          }
        }
      }
    }),
  ]);

  // Calculate completion rate
  const completionRate = totalAppointments > 0 
    ? Math.round((completedAppointments / totalAppointments) * 100) 
    : 0;

  // Calculate revenue growth (compare with previous period)
  const previousPeriodStart = new Date(dateRange.gte);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
  const previousPeriodEnd = new Date(dateRange.lte);
  previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

  const previousAppointments = await prisma.appointment.findMany({
    where: { 
      clinicId,
      startTime: {
        gte: previousPeriodStart,
        lte: previousPeriodEnd
      },
      transaction: {
        status: 'completed'
      }
    },
    include: {
      transaction: {
        select: {
          amount: true
        }
      }
    }
  });

  const currentRevenue = totalRevenue._sum?.amount || 0;
  const prevRevenue = previousAppointments.reduce((sum, apt) => sum + (apt.transaction?.amount || 0), 0);
  const revenueGrowth = prevRevenue > 0 
    ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)
    : 0;

  return {
    // Summary metrics
    summary: {
      totalAppointments,
      completedAppointments,
      pendingAppointments,
      cancelledAppointments,
      upcomingAppointments,
      todayAppointments,
      completionRate,
      totalClients,
      activeClients,
      newClientsThisMonth,
      totalClinicians,
      activeClinicians,
    },
    
    // Financial metrics
    financial: {
      totalRevenue: currentRevenue,
      pendingRevenue: pendingRevenue._sum?.amount || 0,
      revenueGrowth,
      averageAppointmentValue: totalAppointments > 0 
        ? Math.round(currentRevenue / totalAppointments) 
        : 0,
    },
    
    // Recent activity
    recentAppointments: recentAppointments.map(apt => ({
      id: apt.id,
      clientName: `${apt.client.firstName} ${apt.client.lastName}`,
      sessionName: apt.session.name,
      clinicianName: `${apt.clinician.user.firstName} ${apt.clinician.user.lastName}`,
      startTime: apt.startTime,
      status: apt.status,
      price: apt.session.price,
    })),
    
    // Subscription info
    subscription: subscriptionInfo ? {
      planName: subscriptionInfo.plan.name,
      status: subscriptionInfo.status,
      clientLimit: subscriptionInfo.plan.clientLimit,
      clientUsage: totalClients,
      usagePercentage: subscriptionInfo.plan.clientLimit 
        ? Math.round((totalClients / subscriptionInfo.plan.clientLimit) * 100)
        : 0,
    } : null,
    
    // Date range for context
    dateRange,
  };
};

/**
 * Get calendar appointments for dashboard
 * @param {string} clinicId
 * @param {any} filter
 * @returns {Promise<any>}
 */
const getDashboardCalendar = async (clinicId: string, filter: any) => {
  const { startDate, endDate, view = 'month' } = filter;
  
  // Default date range based on view
  let dateRange: { gte: Date; lte: Date };
  
  if (startDate && endDate) {
    dateRange = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  } else {
    // Default based on view type
    const now = new Date();
    
    switch (view) {
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        dateRange = { gte: startOfWeek, lte: endOfWeek };
        break;
        
      case 'day':
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const endOfDay = new Date(now.setHours(23, 59, 59, 999));
        dateRange = { gte: startOfDay, lte: endOfDay };
        break;
        
      default: // month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        dateRange = { gte: startOfMonth, lte: endOfMonth };
    }
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      startTime: dateRange,
    },
    orderBy: { startTime: 'asc' },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
      session: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
          color: true,
        },
      },
      clinician: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  // Format appointments for calendar display
  const calendarEvents = appointments.map(appointment => ({
    id: appointment.id,
    title: `${appointment.session.name} - ${appointment.client.firstName} ${appointment.client.lastName}`,
    start: appointment.startTime,
    end: appointment.endTime,
    status: appointment.status,
    meetingType: appointment.meetingType,
    client: appointment.client,
    clinician: appointment.clinician,
    session: appointment.session,
    note: appointment.note,
    zoomJoinUrl: appointment.zoomJoinUrl,
    backgroundColor: appointment.session.color || getStatusColor(appointment.status),
    borderColor: appointment.session.color || getStatusColor(appointment.status),
    textColor: '#ffffff',
  }));

  return {
    events: calendarEvents,
    totalCount: appointments.length,
    dateRange,
    view,
  };
};

/**
 * Get clinician's personal dashboard
 * @param {string} clinicianId
 * @param {any} filter
 * @returns {Promise<any>}
 */
const getClinicianDashboard = async (clinicianId: string, filter: any) => {
  const { startDate, endDate } = filter;
  
  // Default to current month if no dates provided
  let dateRange: { gte: Date; lte: Date };
  
  if (startDate && endDate) {
    dateRange = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  } else {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    dateRange = {
      gte: startOfMonth,
      lte: endOfMonth,
    };
  }

  const [
    // Personal appointment metrics
    totalAppointments,
    completedAppointments,
    upcomingAppointments,
    todayAppointments,
    
    // Personal revenue
    totalRevenue,
    
    // Today's schedule
    todaySchedule,
    
    // Recent clients
    recentClients,
    
    // Clinician info
    clinicianInfo,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { clinicianId, startTime: dateRange }
    }),
    prisma.appointment.count({
      where: { clinicianId, startTime: dateRange, status: AppointmentStatus.completed }
    }),
    prisma.appointment.count({
      where: { 
        clinicianId, 
        status: { in: [AppointmentStatus.pending, AppointmentStatus.scheduled] },
        startTime: { gte: new Date() }
      }
    }),
    prisma.appointment.count({
      where: {
        clinicianId,
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    }),
    
    prisma.appointment.findMany({
      where: { 
        clinicianId,
        startTime: dateRange,
        transaction: {
          status: 'completed'
        }
      },
      include: {
        transaction: {
          select: {
            amount: true
          }
        }
      }
    }).then(appointments => {
      const total = appointments.reduce((sum, apt) => sum + (apt.transaction?.amount || 0), 0);
      return { _sum: { amount: total } };
    }),
    
    // Today's appointments
    prisma.appointment.findMany({
      where: {
        clinicianId,
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      orderBy: { startTime: 'asc' },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        session: {
          select: {
            name: true,
            duration: true,
            price: true,
          }
        }
      }
    }),
    
    // Recent unique clients
    prisma.appointment.findMany({
      where: { clinicianId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      distinct: ['clientId'],
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    }),
    
    // Clinician details
    prisma.clinicMember.findUnique({
      where: { id: clinicianId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          }
        },
        clinic: {
          select: {
            name: true,
          }
        }
      }
    }),
  ]);

  const completionRate = totalAppointments > 0 
    ? Math.round((completedAppointments / totalAppointments) * 100) 
    : 0;

  return {
    // Personal metrics
    summary: {
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      todayAppointments,
      completionRate,
      totalRevenue: totalRevenue._sum?.amount || 0,
      averageAppointmentValue: totalAppointments > 0 
        ? Math.round((totalRevenue._sum?.amount || 0) / totalAppointments) 
        : 0,
    },
    
    // Today's schedule
    todaySchedule: todaySchedule.map(apt => ({
      id: apt.id,
      clientName: `${apt.client.firstName} ${apt.client.lastName}`,
      sessionName: apt.session.name,
      startTime: apt.startTime,
      endTime: apt.endTime,
      duration: apt.session.duration,
      status: apt.status,
      price: apt.session.price,
    })),
    
    // Recent clients
    recentClients: recentClients.map(apt => ({
      id: apt.client.id,
      name: `${apt.client.firstName} ${apt.client.lastName}`,
      email: apt.client.email,
      lastAppointment: apt.createdAt,
    })),
    
    // Clinician info
    clinician: clinicianInfo ? {
      name: `${clinicianInfo.user.firstName} ${clinicianInfo.user.lastName}`,
      avatar: clinicianInfo.user.avatar,
      email: clinicianInfo.user.email,
      clinic: clinicianInfo.clinic.name,
      role: clinicianInfo.role,
    } : null,
    
    dateRange,
  };
};

/**
 * Get dashboard quick stats
 * @param {string} clinicId
 * @returns {Promise<any>}
 */
const getQuickStats = async (clinicId: string) => {
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const endOfToday = new Date(today.setHours(23, 59, 59, 999));
  
  const [
    todayAppointments,
    upcomingAppointments,
    totalClients,
    totalClinicians,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        clinicId,
        startTime: { gte: startOfToday, lte: endOfToday }
      }
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        status: { in: [AppointmentStatus.pending, AppointmentStatus.scheduled] },
        startTime: { gte: new Date() }
      }
    }),
    prisma.client.count({ where: { clinicId } }),
    prisma.clinicMember.count({ where: { clinicId } }),
  ]);

  return {
    todayAppointments,
    upcomingAppointments,
    totalClients,
    totalClinicians,
  };
};

// Helper function to get status colors
const getStatusColor = (status: AppointmentStatus): string => {
  switch (status) {
    case AppointmentStatus.completed:
      return '#4caf50'; // Green
    case AppointmentStatus.pending:
      return '#ff9800'; // Orange
    case AppointmentStatus.cancelled:
      return '#f44336'; // Red
    case AppointmentStatus.scheduled:
      return '#2196f3'; // Blue
    default:
      return '#3788d8'; // Default blue
  }
};

export default {
  getDashboardOverview,
  getDashboardCalendar,
  getClinicianDashboard,
  getQuickStats,
};