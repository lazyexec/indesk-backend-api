import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import clinicService from "./clinic.service";
import response from "../../configs/response";
import ApiError from "../../utils/ApiError";
import env from "../../configs/env";
import fs from "../../utils/fs";
import pick from "../../utils/pick";

const createClinic = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as any;
  const body = req.body as any;
  let logo: string | undefined = undefined;
  if (files?.logo?.[0]) {
    const file = files.logo[0];
    logo = env.BACKEND_URL + "/public" + fs.sanitizePath(file.path);
  }

  const clinic = await clinicService.createClinic({ ...body, logo });

  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Clinic created successfully",
      data: clinic,
    })
  );
});

const getClinic = catchAsync(async (req: Request, res: Response) => {
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

const getClinics = catchAsync(async (req: Request, res: Response) => {
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

const updateClinic = catchAsync(async (req: Request, res: Response) => {
  const { clinicId } = req.params;
  const files = req.files as any;
  const { name, email, phoneNumber, address } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (address !== undefined) updateData.address = address;

  const clinic = await clinicService.updateClinic(clinicId, updateData, files);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic updated successfully",
      data: clinic,
    })
  );
});

const updatePermissions = catchAsync(async (req: Request, res: Response) => {
  const { clinicId } = req.params;
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

const deleteClinic = catchAsync(async (req: Request, res: Response) => {
  const { clinicId } = req.params;

  const clinic = await clinicService.deleteClinic(clinicId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic deleted successfully",
      data: clinic,
    })
  );
});

export default {
  createClinic,
  getClinic,
  getClinics,
  updateClinic,
  updatePermissions,
  deleteClinic,
};
