import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

/**
 * Create a new patient (client)
 * Note: created_by tracking is not in the schema yet, but tracked via comment
 * @param clinicId - Clinic ID
 * @param patientData - Patient data
 * @param createdBy - User ID who created the patient
 */
const createPatient = async (
  clinicId: string,
  patientData: {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: Date;
    gender: string;
    phoneNumber?: string;
    address?: any;
    allergies?: string[];
    medications?: string[];
    medicalAlert?: string;
  },
  createdBy: string // TODO: Add createdBy field to Client schema for tracking
) => {
  // Verify clinic exists
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  // Create patient
  const patient = await prisma.client.create({
    data: {
      ...patientData,
      clinicId: clinicId,
      allergies: patientData.allergies || [],
      medications: patientData.medications || [],
    },
  });

  // Note: createdBy is tracked in the function parameter but not stored in DB
  // Consider adding a createdBy field to the Client schema in the future

  return patient;
};

/**
 * Get all patients for a clinic
 * @param clinicId - Clinic ID
 * @param filters - Optional filters (search, pagination)
 */
const getPatientsByClinic = async (
  clinicId: string,
  filters?: {
    search?: string;
    limit?: number;
    page?: number;
  }
) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  const where: any = { clinicId: clinicId };

  // Add search filter if provided
  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const limit = filters?.limit || 20;
  const page = filters?.page || 1;
  const skip = (page - 1) * limit;

  const [patients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      take: limit,
      skip: skip,
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    patients,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single patient by ID
 * Ensures patient belongs to the specified clinic
 * @param clinicId - Clinic ID
 * @param patientId - Patient ID
 */
const getPatientById = async (clinicId: string, patientId: string) => {
  const patient = await prisma.client.findUnique({
    where: { id: patientId },
    include: {
      appointments: {
        take: 5,
        orderBy: { startTime: "desc" },
        include: {
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      notes: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
      assessments: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, "Patient not found");
  }

  // Ensure patient belongs to the specified clinic
  if (patient.clinicId !== clinicId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Patient does not belong to this clinic"
    );
  }

  return patient;
};

export default {
  createPatient,
  getPatientsByClinic,
  getPatientById,
};
