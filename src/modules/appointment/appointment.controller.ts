import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppointmentService from "./appointment.service";
import response from "../../utils/response";
import pick from "../../utils/pick";

const createAppointment = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  const Appointment = await AppointmentService.createAppointment(
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

export default {
  createAppointment,
  getClientAppointments,
};
