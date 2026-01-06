import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import email from "../../configs/email";
import env from "../../configs/env";

const generateRandomPassword = (): string => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

const addClinicMember = async (
  actorId: string,
  clinicId: string,
  memberData: any
) => {
  const {
    email: memberEmail,
    role,
    firstName,
    lastName,
    availability,
    specilization,
    ...userData
  } = memberData;
  // Verify clinic exists
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  // Verify actor permissions
  const actorMember = await prisma.clinicMember.findUnique({
    where: {
      userId_clinicId: {
        userId: actorId,
        clinicId: clinicId,
      },
    },
  });

  if (!actorMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not a member of this clinic"
    );
  }

  // Only superAdmin can add admins
  if (role === "admin" && actorMember.role !== "superAdmin") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only Super Admins can add Admins"
    );
  }

  // Ensure only admins/superAdmins can add members (redundant if route has checks, but good for safety)
  if (actorMember.role !== "admin" && actorMember.role !== "superAdmin") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You do not have permission to add members"
    );
  }

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: memberEmail },
  });

  let generatedPassword: string | null = null;

  // Create user if doesn't exist
  if (!user) {
    generatedPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    user = await prisma.user.create({
      data: {
        email: memberEmail,
        firstName: firstName || null,
        lastName: lastName || null,
        password: hashedPassword,
        role: "user", // Platform-level role
        isEmailVerified: true, // Auto-verify for clinic members
        ...userData,
      },
    });

    // Send welcome email if not in debug mode
    if (!env.DEBUG) {
      await email.sendWelcomeEmail(memberEmail, generatedPassword);
    }
  }

  // Check if already a member
  const existingMembership = await prisma.clinicMember.findUnique({
    where: {
      userId_clinicId: {
        userId: user.id,
        clinicId: clinicId,
      },
    },
  });

  if (existingMembership) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User is already a member of this clinic"
    );
  }

  // Create clinic membership
  const clinicMember = await prisma.clinicMember.create({
    data: {
      userId: user.id,
      clinicId: clinicId,
      role: role,
      availability: availability || null,
      specilization: specilization || [],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return {
    member: clinicMember,
    generatedPassword: generatedPassword,
  };
};

const getClinicMembers = async (
  clinicId: string,
  userId: string,
  options: any
) => {
  const clinicMember = await prisma.clinicMember.findUnique({
    where: {
      userId_clinicId: {
        userId,
        clinicId,
      },
    },
  });

  if (!clinicMember) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic member not found");
  }

  const filter: any = { clinicId: clinicId };
  if (clinicMember.role === "clinician") {
    filter.role = "clinician";
  } else if (options.role) {
    filter.role = options.role;
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  const members = await prisma.clinicMember.findMany({
    where: filter,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
    take: options.limit,
    skip: (options.page - 1) * options.limit,
    orderBy: {
      createdAt: options.sort === "createdAt_desc" ? "desc" : "asc",
    },
  });

  return members;
};

const removeClinicMember = async (clinicId: string, memberId: string) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  const member = await prisma.clinicMember.findUnique({
    where: { id: memberId },
    include: {
      user: true,
    },
  });

  if (!member) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic member not found");
  }

  // Prevent removal if member is the clinic owner
  if (member.userId === clinic.ownerId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot remove clinic owner from members"
    );
  }

  // Ensure member belongs to the specified clinic
  if (member.clinicId !== clinicId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Member does not belong to this clinic"
    );
  }

  await prisma.clinicMember.delete({
    where: { id: memberId },
  });

  return { message: "Clinic member removed successfully" };
};

export default {
  addClinicMember,
  getClinicMembers,
  removeClinicMember,
};
