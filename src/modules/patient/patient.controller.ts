import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import patientService from "./patient.service";
import response from "../../configs/response";
import ApiError from "../../utils/ApiError";

const createPatient = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { clinicId } = req.params;
  const {
    firstName,
    lastName,
    email,
    dateOfBirth,
    gender,
    phoneNumber,
    address,
    allergies,
    medications,
    medicalAlert,
  } = req.body;

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const patient = await patientService.createPatient(
    clinicId,
    {
      firstName,
      lastName,
      email,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      phoneNumber,
      address,
      allergies,
      medications,
      medicalAlert,
    },
    user.id
  );

  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Patient created successfully",
      data: patient,
    })
  );
});

const getPatients = catchAsync(async (req: Request, res: Response) => {
  const { clinicId } = req.params;
  const { search, limit, page } = req.query;

  const result = await patientService.getPatientsByClinic(clinicId, {
    search: search as string,
    limit: limit ? parseInt(limit as string) : undefined,
    page: page ? parseInt(page as string) : undefined,
  });

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Patients retrieved successfully",
      data: result.patients,
      pagination: result.pagination,
    })
  );
});

const getPatient = catchAsync(async (req: Request, res: Response) => {
  const { clinicId, patientId } = req.params;

  const patient = await patientService.getPatientById(clinicId, patientId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Patient retrieved successfully",
      data: patient,
    })
  );
});

export default {
  createPatient,
  getPatients,
  getPatient,
};
