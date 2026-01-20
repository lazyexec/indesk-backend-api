import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import clinicService from "./clinic.service";
import response from "../../utils/response";
import ApiError from "../../utils/ApiError";
import pick from "../../utils/pick";


// Provider routes (admin access to all clinics)
const getAllClinicsForProvider = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["limit", "page", "sort"]);
  const clinics = await clinicService.getClinics(options);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinics retrieved successfully",
      data: clinics,
    })
  );
});

const getClinicByIdForProvider = catchAsync(async (req: Request, res: Response) => {
  const { clinicId } = req.params;
  const clinic = await clinicService.getClinicById(clinicId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic retrieved successfully",
      data: clinic,
    })
  );
});

const createClinicForProvider = catchAsync(async (req: Request, res: Response) => {
  const clinic = await clinicService.createClinic(req.body);

  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Clinic created successfully by provider",
      data: clinic,
    })
  );
});

// Clinic member routes (uses authenticated user's clinic)
const getOwnClinic = catchAsync(async (req: Request, res: Response) => {
  const clinicId = req.user?.clinicId;

  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "You are not associated with any clinic");
  }

  const clinic = await clinicService.getClinicById(clinicId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic retrieved successfully",
      data: clinic,
    })
  );
});

const updateOwnClinic = catchAsync(async (req: Request, res: Response) => {
  const clinicId = req.user?.clinicId;

  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "You are not associated with any clinic");
  }

  const files = req.files as any;
  const { name, email, phoneNumber, address, countryCode, description, color } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (countryCode !== undefined) updateData.countryCode = countryCode;
  if (address !== undefined) updateData.address = address;
  if (description !== undefined) updateData.description = description;
  if (color !== undefined) updateData.color = color;

  const clinic = await clinicService.updateClinic(clinicId, updateData, files);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic updated successfully",
      data: clinic,
    })
  );
});

const updateOwnClinicPermissions = catchAsync(async (req: Request, res: Response) => {
  const clinicId = req.user?.clinicId;

  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "You are not associated with any clinic");
  }

  const permissions = req.body;

  const clinic = await clinicService.updateClinic(
    clinicId,
    { permissions },
    []
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic permissions updated successfully",
      data: clinic,
    })
  );
});

const deleteOwnClinic = catchAsync(async (req: Request, res: Response) => {
  const clinicId = req.user?.clinicId;

  if (!clinicId) {
    throw new ApiError(httpStatus.NOT_FOUND, "You are not associated with any clinic");
  }

  const clinic = await clinicService.deleteClinic(clinicId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic deleted successfully",
      data: {},
    })
  );
});

export default {
  // Provider routes
  getAllClinicsForProvider,
  getClinicByIdForProvider,
  createClinicForProvider,

  // Clinic member routes
  getOwnClinic,
  updateOwnClinic,
  updateOwnClinicPermissions,
  deleteOwnClinic,
};
