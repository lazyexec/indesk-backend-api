import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import AppointmentService from "./appointment.service";
import response from "../../utils/response";
import pick from "../../utils/pick";
import stripeService from "../stripe/stripe.service";
import ApiError from "../../utils/ApiError";

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

// Public routes (no authentication required)
const getAppointmentByToken = catchAsync(
  async (req: Request, res: Response) => {
    const { token } = req.params;
    const appointment = await AppointmentService.getAppointmentByToken(token);
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Appointment retrieved successfully",
        data: appointment,
      })
    );
  }
);

const createPaymentSession = catchAsync(async (req: Request, res: Response) => {
  const { appointmentId, token } = req.body;

  if (!appointmentId || !token) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Appointment ID and token are required"
    );
  }

  const paymentSession = await stripeService.createAppointmentPaymentSession(
    appointmentId,
    token
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Payment session created successfully",
      data: paymentSession,
    })
  );
});

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

export default {
  createAppointment,
  getClientAppointments,
  getAppointmentByToken,
  createPaymentSession,
  getAppointmentById,
};
