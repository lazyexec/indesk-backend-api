import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import response from "../../utils/response";
import clinicalNoteService from "./clinicalNote.service";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import pick from "../../utils/pick";

const createClinicalNote = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id as string;

  // We need the clinicalMemberId for the authorId
  // In this system, one user can belong to multiple clinics, but usually one at a time/per request context.
  // However, the ClinicalNote model is fairly global.
  // Let's find the clinic membership for this user.
  // If the user is creating a note for a client, the client belongs to a clinic.
  // We should ensure the user is a member of THAT clinic.

  const { clientId, note } = req.body;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { clinicId: true },
  });

  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
  }

  const membership = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId: client.clinicId,
    },
  });

  if (!membership) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not a member of the clinic this client belongs to",
    );
  }

  const clinicalNote = await clinicalNoteService.createClinicalNote(
    membership.id,
    clientId,
    note,
  );

  res.status(httpStatus.CREATED).send(
    response({
      status: httpStatus.CREATED,
      message: "Clinical note created successfully",
      data: clinicalNote,
    }),
  );
});

const getClinicalNotes = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ["clientId", "authorId"]);
  const options = pick(req.query, ["sortBy", "limit", "page", "sortOrder"]);

  const result = await clinicalNoteService.queryClinicalNotes(filter, options);

  res.status(httpStatus.OK).send(
    response({
      status: httpStatus.OK,
      message: "Clinical notes retrieved successfully",
      data: result,
    }),
  );
});

const getClinicalNote = catchAsync(async (req: Request, res: Response) => {
  const clinicalNote = await clinicalNoteService.getClinicalNoteById(
    req.params.clinicalNoteId,
  );

  res.status(httpStatus.OK).send(
    response({
      status: httpStatus.OK,
      message: "Clinical note retrieved successfully",
      data: clinicalNote,
    }),
  );
});

const updateClinicalNote = catchAsync(async (req: Request, res: Response) => {
  const clinicalNote = await clinicalNoteService.updateClinicalNoteById(
    req.params.clinicalNoteId,
    req.body,
  );

  res.status(httpStatus.OK).send(
    response({
      status: httpStatus.OK,
      message: "Clinical note updated successfully",
      data: clinicalNote,
    }),
  );
});

const deleteClinicalNote = catchAsync(async (req: Request, res: Response) => {
  await clinicalNoteService.deleteClinicalNoteById(req.params.clinicalNoteId);

  res.status(httpStatus.OK).send(
    response({
      status: httpStatus.OK,
      message: "Clinical note deleted successfully",
      data: null,
    }),
  );
});

export default {
  createClinicalNote,
  getClinicalNotes,
  getClinicalNote,
  updateClinicalNote,
  deleteClinicalNote,
};
