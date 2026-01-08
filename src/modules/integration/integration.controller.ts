import catchAsync from "../../utils/catchAsync";
import { Request, Response } from "express";
import httpStatus from "http-status";
import integrationService from "./integration.service";
import clinicService from "../clinic/clinic.service";
import response from "../../utils/response";
import ApiError from "../../utils/ApiError";

const getIntegrations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id as string;
  const clinicId = await clinicService.getClinicIdByUserId(userId);
  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found for this user");
  }

  const integrations = await integrationService.getIntegrations(clinicId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Integrations retrieved successfully",
      data: integrations,
    })
  );
});

const connectIntegration = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id as string;
  const clinicId = await clinicService.getClinicIdByUserId(userId);
  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found for this user");
  }

  const { type, config } = req.body;
  const integration = await integrationService.connectIntegration(
    clinicId,
    type,
    config
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: `${type} connected successfully`,
      data: integration,
    })
  );
});

const disconnectIntegration = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id as string;
    const clinicId = await clinicService.getClinicIdByUserId(userId);
    if (!clinicId) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Clinic not found for this user"
      );
    }

    const { type } = req.body;
    const integration = await integrationService.disconnectIntegration(
      clinicId,
      type
    );

    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: `${type} disconnected successfully`,
        data: integration,
      })
    );
  }
);

export default {
  getIntegrations,
  connectIntegration,
  disconnectIntegration,
};
