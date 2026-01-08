import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import ClientService from "./client.service";
import response from "../../utils/response";
import pick from "../../utils/pick";
import clinicService from "../clinic/clinic.service";

const createClient = catchAsync(async (req: Request, res: Response) => {
  const userId: string = req.user?.id!;
  const Client = await ClientService.createClient(userId, req.body);
  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Client created successfully",
      data: Client,
    })
  );
});

const getClients = catchAsync(async (req: Request, res: Response) => {
  const clinicId = await clinicService.getClinicIdByUserId(req.user?.id!);
  const filter = pick(req.query, ["addedBy", "search"]);
  const options = pick(req.query, ["limit", "page", "sort"]);
  const result = await ClientService.getClients(
    { clinicId, ...filter },
    options
  );
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clients retrieved successfully",
      data: result,
    })
  );
});

const getClient = catchAsync(async (req: Request, res: Response) => {
  const Client = await ClientService.getClientById(req.params.clientId);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Client retrieved successfully",
      data: Client,
    })
  );
});

const updateClient = catchAsync(async (req: Request, res: Response) => {
  const Client = await ClientService.updateClient(
    req.params.clientId,
    req.body
  );
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Client updated successfully",
      data: Client,
    })
  );
});

const deleteClient = catchAsync(async (req: Request, res: Response) => {
  await ClientService.deleteClient(req.params.clientId);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Client deleted successfully",
    })
  );
});

export default {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
};
