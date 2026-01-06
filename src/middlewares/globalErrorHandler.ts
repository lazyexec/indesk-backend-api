import env from "../configs/env";
import httpStatus from "http-status";
import ApiError from "../utils/ApiError";
import logger from "../utils/logger";
import mongoose from "mongoose";
import type { Request, Response, NextFunction } from "express";

const errorConverter = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const status =
      error.status || error instanceof mongoose.Error
        ? httpStatus.BAD_REQUEST
        : httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[status];
    error = new ApiError(status, message, false, err.stack);
  }
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { status, message } = err;
  if (env.DEBUG && !err.isOperational) {
    status = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: status,
    message,
    ...(env.DEBUG && { stack: err.stack }),
  };

  if (env.DEBUG) {
    logger.error(err);
  }

  res.status(status).send(response);
};

export { errorConverter, errorHandler };
