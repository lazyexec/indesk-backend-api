import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import clinicMemberService from "./clinicMember.service";
import response from "../../utils/response";
import env from "../../configs/env";
import pick from "../../utils/pick";
import clinicService from "../clinic/clinic.service";

const addMember = catchAsync(async (req: Request, res: Response) => {
  const memberData = req.body;
  const actorId = req.user!.id;
  const clinicId = await clinicService.getClinicIdByUserId(actorId!);
  const result = await clinicMemberService.addClinicMember(
    actorId!,
    clinicId!,
    memberData
  );

  res.status(httpStatus.CREATED).json(
    response({
      status: httpStatus.CREATED,
      message: result.generatedPassword
        ? env.DEBUG
          ? "Clinic member added successfully. User account created with temporary password."
          : "Clinic member added successfully. Temporary password sent via email."
        : "Clinic member added successfully",
      data: {
        member: result.member,
        ...(result.generatedPassword &&
          env.DEBUG && {
            temporaryPassword: result.generatedPassword,
          }),
      },
    })
  );
});

const getMembers = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const clinicId = await clinicService.getClinicIdByUserId(userId!);
  const options = pick(req.query, ["role", "limit", "page", "sort"]);
  const members = await clinicMemberService.getClinicMembers(
    clinicId!,
    userId!,
    options
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic members retrieved successfully",
      data: members,
    })
  );
});

const removeMember = catchAsync(async (req: Request, res: Response) => {
  const { memberId } = req.params;

  await clinicMemberService.removeClinicMember(memberId);

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic member removed successfully",
    })
  );
});

const updateMember = catchAsync(async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const updateData = req.body;
  const actorId = req.user!.id;
  const clinicId = await clinicService.getClinicIdByUserId(actorId!);

  const updatedMember = await clinicMemberService.updateClinicMember(
    actorId!,
    clinicId!,
    memberId,
    updateData
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic member updated successfully",
      data: updatedMember,
    })
  );
});

const updateMemberRole = catchAsync(async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const { role } = req.body;
  const actorId = req.user!.id;
  const clinicId = await clinicService.getClinicIdByUserId(actorId!);

  const updatedMember = await clinicMemberService.updateClinicMemberRole(
    actorId!,
    clinicId!,
    memberId,
    role
  );

  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Clinic member role updated successfully",
      data: updatedMember,
    })
  );
});

export default {
  addMember,
  getMembers,
  removeMember,
  updateMember,
  updateMemberRole,
};
