import catchAsync from "../../utils/catchAsync";
import { Types } from "mongoose";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import userService from "../user/user.service";
import authService from "./auth.service";
import ApiError from "../../utils/ApiError";
import response from "../../configs/response";
import tokenService from "../token/token.service";
import { IUser } from "../user/user.interface";

const register = catchAsync(async (req: Request, res: Response) => {
  await authService.register(req.body);
  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: "Thank you for registering. Please verify your email",
    })
  );
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password, fcmToken } = req.body;
  const user = await authService.login(email, password);
  const token = await tokenService.generateUserTokens({
    userId: user?.id!,
    deviceId: req.device?.host || null,
    ip: req.device?.ip || null,
    userAgent: req.get("User-Agent") || null,
  });
  if (fcmToken) {
    await userService.updateUser(user?.id!, { fcmToken }, {});
  }
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Login successful",
      data: user,
      token,
    })
  );
});

const verifyAccount = catchAsync(async (req: Request, res: Response) => {
  const { email, code } = req.body;
  const user = await authService.verifyAccount(email, code);
  const token = await tokenService.generateUserTokens({
    userId: user.id,
    deviceId: req.device?.host || null,
    ip: req.device?.ip || null,
    userAgent: req.get("User-Agent") || null,
  });
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Account verified successfully",
      data: user,
      token,
    })
  );
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const removedToken = await tokenService.revokeRefreshToken(
    refreshToken,
    "refresh"
  );
  if (!removedToken) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid Refresh Token");
  }
  res
    .status(httpStatus.OK)
    .json(response({ status: httpStatus.OK, message: "Logout successful" }));
});

const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken;
  const token = await tokenService.refreshAuth(refreshToken, {
    ip: req.device?.ip || null,
    userAgent: req.get("User-Agent") || null,
    deviceId: req.device?.host || null,
  });
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Refresh token successful",
      token,
    })
  );
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  await authService.forgotPassword(email);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Password reset email sent",
    })
  );
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, password } = req.body;
  await authService.resetPassword(email, otp, password);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Password reset successful",
    })
  );
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const user: any = req.user;
  await authService.changePassword(user?.id, oldPassword, newPassword);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Password changed successfully",
    })
  );
});

const deleteAccount = catchAsync(async (req: Request, res: Response) => {
  const user: any = req.user;
  await authService.deleteAccount(user?.id);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Account deleted successfully",
    })
  );
});

const reqVerifyAccount = catchAsync(async (req: Request, res: Response) => {
  const user = req?.user;
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User not found");
  }
  await authService.reqVerifyAccount(user as IUser);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Verification email sent",
    })
  );
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const email = req.body.email;
  if (!email) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is required");
  }
  await authService.resendOtp(email);
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Verification Email Re-Sent!",
    })
  );
});

export default {
  register,
  login,
  verifyAccount,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  reqVerifyAccount,
  resendOtp,
};
