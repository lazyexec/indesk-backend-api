import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import sessionService from "./session.service";
import response from "../../utils/response";
import pick from "../../utils/pick";

const createSession = catchAsync(async (req: Request, res: Response) => {
  const session = await sessionService.createSession(req.body);
  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Session created successfully",
      data: session,
    })
  );
});

const getSessions = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ["clinicId"]);
  const options = pick(req.query, ["limit", "page", "sort"]);
  const result = await sessionService.getSessions(filter, options);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Sessions retrieved successfully",
      data: result,
    })
  );
});

const getSession = catchAsync(async (req: Request, res: Response) => {
  const session = await sessionService.getSessionById(req.params.sessionId);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Session retrieved successfully",
      data: session,
    })
  );
});

const updateSession = catchAsync(async (req: Request, res: Response) => {
  const session = await sessionService.updateSession(
    req.params.sessionId,
    req.body
  );
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Session updated successfully",
      data: session,
    })
  );
});

const deleteSession = catchAsync(async (req: Request, res: Response) => {
  await sessionService.deleteSession(req.params.sessionId);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Session deleted successfully",
    })
  );
});

export default {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
};
