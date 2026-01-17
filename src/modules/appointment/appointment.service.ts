import { IAppointment } from "./appointment.interface";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { randomBytes } from "crypto";
import transactionService from "../transaction/transaction.service";
import googleCalendarIntegration from "../integration/services/google-calendar.integration";
import stripeIntegration from "../integration/services/stripe.integration";
import zoomIntegration from "../integration/services/zoom.integration";
import { isIntegrationConnected } from "../integration/integration.helper";
import env from "../../configs/env";

interface ICreateAppointment {
  clientId: string;
  sessionId: string;
  clinicianId: string;
  date?: Date; // Optional for backward compatibility
  time: Date; // This should be the full datetime
  note?: string;
  meetingType?: "in_person" | "zoom";
  via?: "token" | "admin";
}

const createAppointment = async (
  addedBy: string,
  appointmentBody: ICreateAppointment
): Promise<any> => {
  const {
    clientId,
    sessionId,
    clinicianId,
    date,
    time,
    note,
    meetingType = "zoom",
    via = "admin",
  } = appointmentBody;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, "Session not found");
  }

  // Handle both cases: separate date/time or combined datetime
  let startTime: Date;

  if (date) {
    // Legacy format: separate date and time
    const appointmentDate = new Date(date);
    const appointmentTime = new Date(time);

    startTime = new Date(
      appointmentDate.getFullYear(),
      appointmentDate.getMonth(),
      appointmentDate.getDate(),
      appointmentTime.getHours(),
      appointmentTime.getMinutes(),
      appointmentTime.getSeconds()
    );
  } else {
    // New format: time is the full datetime
    startTime = new Date(time);
  }

  // Validate the date is valid
  if (isNaN(startTime.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date/time provided");
  }

  const duration = session.duration;
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      clinicianId: clinicianId,
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } },
          ],
        },
      ],
    },
  });

  if (conflictingAppointment) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Time slot is not available");
  }

  const appointmentToken = randomBytes(32).toString("hex");

  const transaction = await transactionService.createTransaction({
    clientId: client.id,
    sessionId,
    amount: session.price,
    method: "stripe",
    description: `${client.firstName} ${client.lastName} appointment with ${session.name}`,
    type: "appointment",
    meta: {
      appointmentToken,
    },
    status: "pending",
  });

  // Create Stripe payment link if integration is connected
  let paymentUrl: string | null = null;
  try {
    const hasStripe = await isIntegrationConnected(session.clinicId, "stripe");
    if (hasStripe) {
      // Use clinic's Stripe Connect integration
      const payment = await stripeIntegration.createPaymentLink(
        session.clinicId,
        {
          amount: session.price,
          description: `Appointment: ${session.name}`,
          metadata: {
            appointmentToken,
            clientId: client.id,
            sessionId,
            transactionId: transaction.id,
          },
        }
      );
      paymentUrl = payment.url;
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, "Payment isn't configured for the clinic")
    }
  } catch (error) {
    console.error("Failed to create Stripe payment link:", error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to create Payment Intent!")
  }

  // Create Zoom meeting if meetingType is zoom and integration is connected
  let zoomJoinUrl: string | null = null;
  let zoomStartUrl: string | null = null;
  let zoomMeetingId: string | null = null;

  if (meetingType === "zoom") {
    try {
      const hasZoom = await isIntegrationConnected(session.clinicId, "zoom");
      if (hasZoom) {
        const meeting = await zoomIntegration.createMeeting(session.clinicId, {
          topic: `${session.name} - ${client.firstName} ${client.lastName}`,
          startTime,
          duration: session.duration,
          agenda: note || `Appointment for ${session.name}`,
        });
        zoomJoinUrl = meeting.joinUrl;
        zoomStartUrl = meeting.startUrl;
        zoomMeetingId = meeting.meetingId;
      }
    } catch (error) {
      console.error("Failed to create Zoom meeting:", error);
      zoomJoinUrl = null;
      zoomStartUrl = null;
      zoomMeetingId = null;
    }
  }

  // Create Google Calendar event if integration is connected (BEFORE creating appointment)
  let googleCalendarEventId: string | null = null;
  try {
    const hasGoogleCalendar = await isIntegrationConnected(
      session.clinicId,
      "google_calendar"
    );
    if (hasGoogleCalendar) {
      const calendarEvent = await googleCalendarIntegration.createCalendarEvent(session.clinicId, {
        title: `${session.name} - ${client.firstName} ${client.lastName}`,
        description: note || `Appointment for ${session.name}`,
        startTime,
        endTime,
        attendees: [client.email],
        location: meetingType === "zoom" ? zoomJoinUrl || undefined : undefined,
      });
      googleCalendarEventId = calendarEvent.eventId;
    }
  } catch (error) {
    console.error("Failed to create Google Calendar event:", error);
    // Continue without calendar event
  }

  // Create appointment with all integration IDs
  const appointment = await prisma.appointment.create({
    data: {
      clinicId: session.clinicId,
      clientId: client.id,
      clinicianId,
      addedBy,
      sessionId,
      note,
      meetingType,
      startTime,
      endTime,
      appointmentToken,
      transactionId: transaction.id,
      zoomJoinUrl,
      zoomStartUrl,
      zoomMeetingId,
      googleCalendarEventId,
      via,
    },
    include: {
      session: {
        select: {
          name: true,
          price: true,
          duration: true,
        },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      clinic: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    appointment,
    paymentUrl,
  };
};

// Token-based appointment creation (public access)
const applyAppointmentWithToken = async (token: string, body: any) => {
  const {
    clientFirstName,
    clientLastName,
    clientEmail,
    clientPhone,
    clientCountryCode,
    sessionId,
    ...rest
  } = body;

  const clinician = await prisma.clinicMember.findUnique({
    where: { clinicianToken: token },
  });

  if (!clinician) {
    throw new ApiError(httpStatus.NOT_FOUND, "Something went wrong!");
  }

  // Find or create client
  let client = await prisma.client.findFirst({
    where: { email: clientEmail, clinicId: clinician.clinicId },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        firstName: clientFirstName,
        lastName: clientLastName,
        email: clientEmail,
        phoneNumber: clientPhone,
        countryCode: clientCountryCode,
        clinicId: clinician.clinicId,
        addedBy: clinician.id,
      },
    });
  }

  // Call the reusable createAppointment function
  const result = await createAppointment(clinician.id, {
    ...rest,
    clientId: client.id,
    clinicianId: clinician.id,
    sessionId,
    via: "token",
  });

  return {
    appointment: result.appointment,
    paymentUrl: result.paymentUrl,
  };
};

// Admin/Employee appointment creation
const createAppointByEmployees = async (
  userId: string,
  appointmentBody: ICreateAppointment
) => {
  // Get session to find clinic ID
  const session = await prisma.session.findUnique({
    where: { id: appointmentBody.sessionId },
    select: { clinicId: true },
  });

  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, "Session not found");
  }

  // Get clinic member ID for the user
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId: session.clinicId,
    },
    select: { id: true },
  });

  if (!clinicMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You don't have access to this clinic"
    );
  }

  // Call the reusable createAppointment function with clinic member ID
  const result = await createAppointment(clinicMember.id, appointmentBody);

  // For admin/employee creation, we don't need to return payment URL
  return result.appointment;
};

// Admin/Clinician: Get all appointments with filters
const getAllAppointments = async (filter: any, options: any) => {
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};

  if (filter.startDate && filter.endDate) {
    where.startTime = {
      gte: new Date(filter.startDate),
      lte: new Date(filter.endDate),
    };
  }

  if (filter.clinicianId) {
    where.clinicianId = filter.clinicianId;
  }

  if (filter.status) {
    where.status = filter.status;
  }

  const [appointments, totalDocs] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: sort,
      skip,
      take,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        session: {
          select: {
            name: true,
            duration: true,
            price: true,
          },
        },
        clinician: {
          select: {
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
    }),
    prisma.appointment.count({
      where,
    }),
  ]);

  return {
    docs: appointments,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

const updateAppointment = async (appointmentId: string, updateBody: any) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Appointment not found");
  }

  // Update
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateBody,
    include: {
      client: true,
      session: true,
    },
  });

  return updatedAppointment;
};

const updateAppointmentStatus = async (appointmentId: string, status: any) => {
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });

  return appointment;
};

const deleteAppointment = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      clinic: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Appointment not found");
  }

  // Delete Google Calendar event if it exists
  if (appointment.googleCalendarEventId) {
    try {
      const hasGoogleCalendar = await isIntegrationConnected(
        appointment.clinicId,
        "google_calendar"
      );
      if (hasGoogleCalendar) {
        await googleCalendarIntegration.deleteCalendarEvent(
          appointment.clinicId,
          appointment.googleCalendarEventId
        );
      }
    } catch (error) {
      console.error("Failed to delete Google Calendar event:", error);
      // Continue with appointment deletion even if calendar deletion fails
    }
  }

  // Delete Zoom meeting if it exists
  if (appointment.zoomMeetingId) {
    try {
      const hasZoom = await isIntegrationConnected(
        appointment.clinicId,
        "zoom"
      );
      if (hasZoom) {
        await zoomIntegration.deleteMeeting(
          appointment.clinicId,
          appointment.zoomMeetingId
        );
      }
    } catch (error) {
      console.error("Failed to delete Zoom meeting:", error);
      // Continue with appointment deletion even if Zoom deletion fails
    }
  }

  await prisma.appointment.delete({
    where: { id: appointmentId },
  });

  return appointment;
};

// Get client appointments Clinician or Admin
const getClientAppointments = async (userId: string, options: any) => {
  const { page = 1, limit = 10, sort = { createdAt: "desc" } } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [appointments, totalDocs] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        clientId: userId,
      },
      orderBy: sort,
      skip,
      take,
    }),
    prisma.appointment.count({
      where: {
        clientId: userId,
      },
    }),
  ]);

  return {
    docs: appointments,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

// Get appointment by id Clinician or Admin
const getAppointmentById = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      session: {
        select: {
          id: true,
          name: true,
          price: true,
          duration: true,
          description: true,
        },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      clinic: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
        },
      },
      clinician: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  if (!appointment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Appointment not found");
  }

  return appointment;
};

// Anyone with the token can get the clinic's sessions
const getAppointmentSessionByToken = async (token: string, options: any) => {
  const { page = 1, limit = 10, sort = { createdAt: "desc" } } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Find the clinician by token
  const clinician = await prisma.clinicMember.findUnique({
    where: { clinicianToken: token },
    select: {
      clinicId: true,
    },
  });

  if (!clinician) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinician not found");
  }

  // Get total count of sessions for the clinic
  const totalDocs = await prisma.session.count({
    where: { clinicId: clinician.clinicId },
  });

  // Get paginated sessions for the clinic
  const sessions = await prisma.session.findMany({
    where: { clinicId: clinician.clinicId },
    skip,
    take,
    orderBy: sort,
  });

  return {
    docs: sessions,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

const getUnpaidAppointments = async (
  userId: string,
  filter: any,
  options: any
) => {
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);
  const clinicName = await prisma.clinicMember.findFirst({
    where: { userId },
    select: { clinic: { select: { id: true } } },
  });

  if (!clinicName) {
    return {
      docs: [],
      totalDocs: 0,
      limit: take,
      page: Number(page),
      totalPages: 0,
    };
  }

  // Find appointments that are pending AND have no invoice attached
  const where: any = {
    status: "pending",
    clinicId: clinicName.clinic.id,
    invoiceId: null,
  };

  if (filter.startDate && filter.endDate) {
    where.startTime = {
      gte: new Date(filter.startDate),
      lte: new Date(filter.endDate),
    };
  }

  const [appointments, totalDocs] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: sort,
      skip,
      take,
    }),
    prisma.appointment.count({
      where,
    }),
  ]);

  return {
    docs: appointments,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};
// Get clinic calendar view - all appointments for the clinic
const getClinicCalendarAppointments = async (
  clinicId: string,
  filter: any,
  options: any
) => {
  const { startDate, endDate, view = 'month' } = filter;

  // Default date range based on view
  let dateRange: { gte: Date; lte: Date };

  if (startDate && endDate) {
    dateRange = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  } else {
    // Default to current month if no dates provided
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    dateRange = {
      gte: startOfMonth,
      lte: endOfMonth,
    };
  }

  const where: any = {
    clinicId,
    startTime: dateRange,
  };

  // Optional status filter
  if (filter.status) {
    where.status = filter.status;
  }

  const appointments = await prisma.appointment.findMany({
    where,
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
          color: true, // Assuming sessions have colors for calendar display
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
    backgroundColor: appointment.session.color || '#3788d8', // Default color
    borderColor: appointment.session.color || '#3788d8',
    textColor: '#ffffff',
  }));

  return {
    events: calendarEvents,
    totalCount: appointments.length,
    dateRange,
  };
};

// Get clinician's personal schedule
const getClinicianSchedule = async (
  clinicianId: string,
  filter: any,
  options: any
) => {
  const { startDate, endDate, view = 'month' } = filter;

  // Default date range based on view
  let dateRange: { gte: Date; lte: Date };

  if (startDate && endDate) {
    dateRange = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  } else {
    // Default to current month if no dates provided
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    dateRange = {
      gte: startOfMonth,
      lte: endOfMonth,
    };
  }

  const where: any = {
    clinicianId,
    startTime: dateRange,
  };

  // Optional status filter
  if (filter.status) {
    where.status = filter.status;
  }

  const appointments = await prisma.appointment.findMany({
    where,
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
      clinic: {
        select: {
          id: true,
          name: true,
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
    session: appointment.session,
    clinic: appointment.clinic,
    note: appointment.note,
    zoomJoinUrl: appointment.zoomJoinUrl,
    backgroundColor: appointment.session.color || '#3788d8',
    borderColor: appointment.session.color || '#3788d8',
    textColor: '#ffffff',
  }));

  return {
    events: calendarEvents,
    totalCount: appointments.length,
    dateRange,
  };
};

// Get appointments by clinic member ID (for specific clinician view)
const getAppointmentsByClinicMemberId = async (
  clinicMemberId: string,
  filter: any,
  options: any
) => {
  const { limit = 10, page = 1, sort = { startTime: "asc" } } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    clinicianId: clinicMemberId,
  };

  // Date range filter
  if (filter.startDate && filter.endDate) {
    where.startTime = {
      gte: new Date(filter.startDate),
      lte: new Date(filter.endDate),
    };
  }

  // Status filter
  if (filter.status) {
    where.status = filter.status;
  }

  const [appointments, totalDocs] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: sort,
      skip,
      take,
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
            description: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.appointment.count({
      where,
    }),
  ]);

  return {
    docs: appointments,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

// Get calendar statistics for dashboard
const getCalendarStats = async (clinicId: string, filter: any) => {
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

  const where = {
    clinicId,
    startTime: dateRange,
  };

  const [
    totalAppointments,
    completedAppointments,
    pendingAppointments,
    cancelledAppointments,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.count({ where: { ...where, status: 'completed' } }),
    prisma.appointment.count({ where: { ...where, status: 'pending' } }),
    prisma.appointment.count({ where: { ...where, status: 'cancelled' } }),
    prisma.appointment.count({
      where: {
        ...where,
        status: { in: ['pending', 'scheduled'] },
        startTime: { gte: new Date() }
      }
    }),
  ]);

  // Get appointments by clinician
  const appointmentsByClinician = await prisma.appointment.groupBy({
    by: ['clinicianId'],
    where,
    _count: {
      id: true,
    },
  });

  // Get clinician details
  const clinicianStats = await Promise.all(
    appointmentsByClinician.map(async (stat) => {
      const clinician = await prisma.clinicMember.findUnique({
        where: { id: stat.clinicianId },
        select: {
          id: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      return {
        clinicianId: stat.clinicianId,
        appointmentCount: stat._count.id,
        clinician,
      };
    })
  );

  return {
    totalAppointments,
    completedAppointments,
    pendingAppointments,
    cancelledAppointments,
    upcomingAppointments,
    appointmentsByClinician: clinicianStats,
    dateRange,
  };
};

export default {
  createAppointment,
  createAppointByEmployees,
  getAllAppointments,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  getClientAppointments,
  getAppointmentById,
  getAppointmentSessionByToken,
  applyAppointmentWithToken,
  getUnpaidAppointments,
  getClinicCalendarAppointments,
  getClinicianSchedule,
  getAppointmentsByClinicMemberId,
  getCalendarStats,
};
