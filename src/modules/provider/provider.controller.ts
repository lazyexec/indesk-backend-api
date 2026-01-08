import catchAsync from "../../utils/catchAsync";
import { Request, Response } from "express";
import httpStatus from "http-status";
import response from "../../utils/response";
import clinicService from "../clinic/clinic.service";

const createClinic = catchAsync(async (req: Request, res: Response) => {
  const { name, ownerEmail, ...rest } = req.body;
  const clinic = await clinicService.createClinic({
    name,
    ownerEmail,
    ...rest,
  });
  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Clinic created successfully",
      data: clinic,
    })
  );
});

const deleteClinic = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const clinic = await clinicService.deleteClinic(id);
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
  deleteClinic,
};
