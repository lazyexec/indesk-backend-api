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

const updateIntegrationSettings = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id as string;
    const clinicId = await clinicService.getClinicIdByUserId(userId);
    if (!clinicId) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Clinic not found for this user"
      );
    }

    const { type, config } = req.body;
    const integration = await integrationService.updateIntegrationSettings(
      clinicId,
      type,
      config
    );

    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: `${type} settings updated successfully`,
        data: integration,
      })
    );
  }
);

const getOAuthUrl = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id as string;
  const clinicId = await clinicService.getClinicIdByUserId(userId);
  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found for this user");
  }

  const { type } = req.params;
  const oauthUrl = await integrationService.getOAuthUrl(clinicId, type as any);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "OAuth URL generated successfully",
      data: { oauthUrl },
    })
  );
});

const handleOAuthCallback = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.params;
  const { code, state, error } = req.query;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  // Handle OAuth errors from provider
  if (error) {
    return res.redirect(
      `${frontendUrl}/settings/integrations?error=${encodeURIComponent(
        error as string
      )}&type=${type}`
    );
  }

  if (!code || !state) {
    return res.redirect(
      `${frontendUrl}/settings/integrations?error=${encodeURIComponent(
        "Missing authorization code"
      )}&type=${type}`
    );
  }

  try {
    const integration = await integrationService.handleOAuthCallback(
      type as any,
      code as string,
      state as string
    );

    // Redirect to frontend success page
    res.redirect(
      `${frontendUrl}/settings/integrations?success=true&type=${type}`
    );
  } catch (error: any) {
    // Redirect to frontend error page
    res.redirect(
      `${frontendUrl}/settings/integrations?error=${encodeURIComponent(
        error.message || "Failed to connect integration"
      )}&type=${type}`
    );
  }
});

export default {
  getIntegrations,
  connectIntegration,
  disconnectIntegration,
  updateIntegrationSettings,
  getOAuthUrl,
  handleOAuthCallback,
};
