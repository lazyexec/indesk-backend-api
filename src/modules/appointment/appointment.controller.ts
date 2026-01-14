import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppointmentService from "./appointment.service";
import response from "../../utils/response";
import pick from "../../utils/pick";
import prisma from "../../configs/prisma";

const createAppointment = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  const Appointment = await AppointmentService.createAppointByEmployees(
    userId,
    req.body
  );
  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Appointment created successfully",
      data: Appointment,
    })
  );
});

const getClientAppointments = catchAsync(
  async (req: Request, res: Response) => {
    const clientId: string = req.params.clientId;
    const options = pick(req.query, ["page", "limit", "sort"]);
    const Appointment = await AppointmentService.getClientAppointments(
      clientId,
      options
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Appointments retrieved successfully",
        data: Appointment,
      })
    );
  }
);

const getAppointmentById = catchAsync(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const appointment = await AppointmentService.getAppointmentById(
    appointmentId
  );
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Appointment retrieved successfully",
      data: appointment,
    })
  );
});

const getAppointmentSessionByToken = catchAsync(
  async (req: Request, res: Response) => {
    const token: string = req.params.token;
    const options = pick(req.query, ["page", "limit", "sort"]);
    const appointment = await AppointmentService.getAppointmentSessionByToken(
      token,
      options
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Appointment retrieved successfully",
        data: appointment,
      })
    );
  }
);

const applyAppointmentWithToken = catchAsync(
  async (req: Request, res: Response) => {
    const token: string = req.params.token;
    const appointment = await AppointmentService.applyAppointmentWithToken(
      token,
      req.body
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Appointment retrieved successfully",
        data: appointment,
      })
    );
  }
);

const getAllAppointments = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sort"]);
  const filter = pick(req.query, [
    "startDate",
    "endDate",
    "clinicianId",
    "status",
  ]);
  const result = await AppointmentService.getAllAppointments(filter, options);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Appointments retrieved successfully",
      data: result,
    })
  );
});

const updateAppointment = catchAsync(async (req: Request, res: Response) => {
  const appointment = await AppointmentService.updateAppointment(
    req.params.appointmentId,
    req.body
  );
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Appointment updated successfully",
      data: appointment,
    })
  );
});

const updateAppointmentStatus = catchAsync(
  async (req: Request, res: Response) => {
    const appointment = await AppointmentService.updateAppointmentStatus(
      req.params.appointmentId,
      req.body.status
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Appointment status updated successfully",
        data: appointment,
      })
    );
  }
);

const deleteAppointment = catchAsync(async (req: Request, res: Response) => {
  await AppointmentService.deleteAppointment(req.params.appointmentId);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Appointment deleted successfully",
      data: null, // or true
    })
  );
});

const getUnpaidAppointments = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const options = pick(req.query, ["page", "limit", "sort"]);
    const filter = pick(req.query, ["startDate", "endDate"]);
    const result = await AppointmentService.getUnpaidAppointments(
      userId,
      filter,
      options
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Appointments retrieved successfully",
        data: result,
      })
    );
  }
);

const getClinicCalendarAppointments = catchAsync(
  async (req: Request, res: Response) => {
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
      return res.status(httpStatus.NOT_FOUND).json(
        response({
          status: httpStatus.NOT_FOUND,
          message: "No clinic association found",
          data: null,
        })
      );
    }

    const filter = pick(req.query, ["startDate", "endDate", "status", "view"]);
    const options = pick(req.query, ["page", "limit", "sort"]);
    
    const result = await AppointmentService.getClinicCalendarAppointments(
      clinicId,
      filter,
      options
    );
    
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Clinic calendar appointments retrieved successfully",
        data: result,
      })
    );
  }
);

const getClinicianSchedule = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  
  // Get clinician ID from user
  const clinicMember = await prisma.clinicMember.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!clinicMember) {
    return res.status(httpStatus.NOT_FOUND).json(
      response({
        status: httpStatus.NOT_FOUND,
        message: "Clinician not found",
        data: null,
      })
    );
  }

  const filter = pick(req.query, ["startDate", "endDate", "status", "view"]);
  const options = pick(req.query, ["page", "limit", "sort"]);
  
  const result = await AppointmentService.getClinicianSchedule(
    clinicMember.id,
    filter,
    options
  );
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinician schedule retrieved successfully",
      data: result,
    })
  );
});

const getAppointmentsByClinicMemberId = catchAsync(
  async (req: Request, res: Response) => {
    const { clinicMemberId } = req.params;
    const filter = pick(req.query, ["startDate", "endDate", "status"]);
    const options = pick(req.query, ["page", "limit", "sort"]);
    
    const result = await AppointmentService.getAppointmentsByClinicMemberId(
      clinicMemberId,
      filter,
      options
    );
    
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Appointments retrieved successfully",
        data: result,
      })
    );
  }
);

const getCalendarStats = catchAsync(async (req: Request, res: Response) => {
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
    return res.status(httpStatus.NOT_FOUND).json(
      response({
        status: httpStatus.NOT_FOUND,
        message: "No clinic association found",
        data: null,
      })
    );
  }

  const filter = pick(req.query, ["startDate", "endDate"]);
  
  const result = await AppointmentService.getCalendarStats(clinicId, filter);
  
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Calendar statistics retrieved successfully",
      data: result,
    })
  );
});

export default {
  createAppointment,
  getClientAppointments,
  getAppointmentById,
  getAppointmentSessionByToken,
  applyAppointmentWithToken,
  getAllAppointments,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  getUnpaidAppointments,
  getClinicCalendarAppointments,
  getClinicianSchedule,
  getAppointmentsByClinicMemberId,
  getCalendarStats,
};
