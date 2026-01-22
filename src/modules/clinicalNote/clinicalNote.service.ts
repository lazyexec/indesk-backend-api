import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { IClinicalNote } from "./clinicalNote.interface";

/**
 * Create a clinical note
 * @param {string} authorId - ClinicMember ID
 * @param {string} clientId
 * @param {string} note
 * @returns {Promise<IClinicalNote>}
 */
const createClinicalNote = async (
  authorId: string,
  clientId: string,
  note: string,
): Promise<IClinicalNote> => {
  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
  }

  const clinicalNote = await prisma.clinicalNote.create({
    data: {
      authorId,
      clientId,
      note,
    },
  });

  return clinicalNote as IClinicalNote;
};

/**
 * Query clinical notes
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryClinicalNotes = async (filter: any, options: any) => {
  const {
    limit = 10,
    page = 1,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const where: any = { ...filter };

  const [notes, totalDocs] = await Promise.all([
    prisma.clinicalNote.findMany({
      where,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        author: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    }),
    prisma.clinicalNote.count({ where }),
  ]);

  return {
    docs: notes,
    totalDocs,
    limit: Number(limit),
    page: Number(page),
    totalPages: Math.ceil(totalDocs / Number(limit)),
  };
};

/**
 * Get clinical note by id
 * @param {string} id
 * @returns {Promise<IClinicalNote>}
 */
const getClinicalNoteById = async (id: string): Promise<IClinicalNote> => {
  const note = await prisma.clinicalNote.findUnique({
    where: { id },
    include: {
      author: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  if (!note) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinical note not found");
  }

  return note as IClinicalNote;
};

/**
 * Update clinical note by id
 * @param {string} id
 * @param {Object} updateBody
 * @returns {Promise<IClinicalNote>}
 */
const updateClinicalNoteById = async (
  id: string,
  updateBody: any,
): Promise<IClinicalNote> => {
  const note = await getClinicalNoteById(id);

  const updatedNote = await prisma.clinicalNote.update({
    where: { id: note.id },
    data: updateBody,
  });

  return updatedNote as IClinicalNote;
};

/**
 * Delete clinical note by id
 * @param {string} id
 * @returns {Promise<IClinicalNote>}
 */
const deleteClinicalNoteById = async (id: string): Promise<IClinicalNote> => {
  const note = await getClinicalNoteById(id);

  await prisma.clinicalNote.delete({
    where: { id: note.id },
  });

  return note;
};

export default {
  createClinicalNote,
  queryClinicalNotes,
  getClinicalNoteById,
  updateClinicalNoteById,
  deleteClinicalNoteById,
};
