import { IAppointment } from "./appointment.interface";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { randomBytes } from "crypto";

interface ICreateAppointment {
  sessionId: string;
  clientEmail: string;
  clinicianId: string;
  date: Date; // Just the date part (e.g., 2024-01-15)
  time: Date; // Just the time part (e.g., 14:30:00)
  note?: string;
  meetingType?: "in_person" | "zoom";
}

const createAppointment = async (
  addedBy: string,
  appointmentBody: ICreateAppointment
): Promise<any> => {
  const {
    sessionId,
    clientEmail,
    clinicianId,
    date,
    time,
    note,
    meetingType = "zoom",
  } = appointmentBody;

  // Find client
  const client = await prisma.client.findFirst({
    where: { email: clientEmail },
  });
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
  }

  // Find session
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, "Session not found");
  }

  // Combine date and time into a single DateTime
  const appointmentDate = new Date(date);
  const appointmentTime = new Date(time);

  const startTime = new Date(
    appointmentDate.getFullYear(),
    appointmentDate.getMonth(),
    appointmentDate.getDate(),
    appointmentTime.getHours(),
    appointmentTime.getMinutes(),
    appointmentTime.getSeconds()
  );

  // Calculate end time (duration is in minutes)
  const duration = session.duration;
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  // Check for time conflicts
  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      clinicianId: clinicianId,
      OR: [
        {
          // New appointment starts during existing appointment
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          // New appointment ends during existing appointment
          AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
        },
        {
          // New appointment completely contains existing appointment
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

  // Generate payment token for public access
  const paymentToken = randomBytes(32).toString("hex");

  // Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      clinicId: session.clinicId,
      clientId: client.id,
      clinicianId: clinicianId,
      addedBy: addedBy,
      sessionId: sessionId,
      note: note,
      meetingType: meetingType,
      startTime: startTime,
      endTime: endTime,
      paymentToken,
      paymentStatus: "pending",
      paymentAmount: session.price,
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

  return appointment;
};

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

/**
 * Get appointment by payment token (public access)
 * @param {string} paymentToken
 * @returns {Promise<any>}
 */
const getAppointmentByToken = async (paymentToken: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { paymentToken },
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
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Appointment not found");
  }

  return appointment;
};

/**
 * Get appointment by ID (for authenticated users)
 * @param {string} appointmentId
 * @returns {Promise<any>}
 */
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
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Appointment not found");
  }

  return appointment;
};

/**
 * Update appointment payment status
 * @param {string} appointmentId
 * @param {string} paymentStatus
 * @param {string} stripeSessionId
 * @returns {Promise<any>}
 */
const updateAppointmentPayment = async (
  appointmentId: string,
  paymentStatus: string,
  stripeSessionId?: string
) => {
  const updateData: any = {
    paymentStatus,
  };

  if (stripeSessionId) {
    updateData.stripeSessionId = stripeSessionId;
  }

  if (paymentStatus === "paid") {
    updateData.paidAt = new Date();
  }

  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
    include: {
      session: {
        select: {
          name: true,
          price: true,
        },
      },
      client: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return appointment;
};

/**
 * Update appointment stripe session ID
 * @param {string} appointmentId
 * @param {string} stripeSessionId
 * @returns {Promise<any>}
 */
const updateAppointmentStripeSession = async (
  appointmentId: string,
  stripeSessionId: string
) => {
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { stripeSessionId },
  });

  return appointment;
};

export default {
  createAppointment,
  getClientAppointments,
  getAppointmentByToken,
  getAppointmentById,
  updateAppointmentPayment,
  updateAppointmentStripeSession,
};
