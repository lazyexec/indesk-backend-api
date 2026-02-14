import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import email from "../../configs/email";
import env from "../../configs/env";
import { ClinicRole } from "@prisma/client";
import limitService from "../subscription/limit.service";

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

const generateRandomToken = (): string => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return token;
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
    specialization,
    ...userData
  } = memberData;

  // Verify clinic exists
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  // Check clinician limit before adding (only for clinician, admin, superAdmin roles)
  if (['clinician', 'admin', 'superAdmin'].includes(role)) {
    await limitService.enforceClinicianLimit(clinicId);
  }

  // Verify actor permissions
  const actorMember = await prisma.clinicMember.findFirst({
    where: {
      clinicId: clinicId,
      userId: actorId,
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
  let user = await prisma.user.findFirst({
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
        lastPasswordChangedAt: new Date(),
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
  const existingMembership = await prisma.clinicMember.findFirst({
    where: {
      clinicId: clinicId,
      userId: user.id,
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
      role: role,
      availability: availability || [],
      specialization: specialization || [],
      clinicianToken: generateRandomToken(),
      clinic: {
        connect: { id: clinicId },
      },
      user: {
        connect: { id: user.id },
      },
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
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      clinicId: clinicId,
      userId: userId,
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

  const [members, totalDocs] = await Promise.all([
    prisma.clinicMember.findMany({
      where: {
        clinicId: clinicId,
        role: filter.role,
      },
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
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: sort,
    }),
    prisma.clinicMember.count({
      where: {
        clinicId: clinicId,
        role: filter.role,
      },
    }),
  ]);

  return {
    docs: members,
    totalDocs,
    limit: Number(limit),
    page: Number(page),
    totalPages: Math.ceil(totalDocs / Number(limit)),
  };
};

const removeClinicMember = async (memberId: string) => {
  const member = await prisma.clinicMember.findUnique({
    where: { id: memberId },
    include: {
      clinic: true,
      user: true,
    },
  });

  if (!member) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic member not found");
  }

  // Prevent removal if member is the clinic owner
  if (member.userId === member.clinic.ownerId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot remove clinic owner from members"
    );
  }

  await prisma.clinicMember.delete({
    where: { id: memberId },
  });

  return { message: "Clinic member removed successfully" };
};

const updateClinicMember = async (
  actorId: string,
  clinicId: string,
  memberId: string,
  updateData: any
) => {
  // Verify clinic exists
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  // Verify actor permissions
  const actorMember = await prisma.clinicMember.findFirst({
    where: {
      clinicId: clinicId,
      userId: actorId,
    },
  });

  if (!actorMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not a member of this clinic"
    );
  }

  // Find the member to update
  const member = await prisma.clinicMember.findUnique({
    where: { id: memberId },
    include: {
      clinic: true,
    },
  });

  if (!member) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic member not found");
  }

  // Verify member belongs to the same clinic
  if (member.clinicId !== clinicId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Member does not belong to your clinic"
    );
  }

  const isUpdatingSelf = actorMember.id === memberId;
  const isAdmin = actorMember.role === "admin" || actorMember.role === "superAdmin";

  // Non-admins can only update themselves
  if (!isAdmin && !isUpdatingSelf) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only update your own profile"
    );
  }

  // Update the member
  const updatedMember = await prisma.clinicMember.update({
    where: { id: memberId },
    data: updateData,
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

  return updatedMember;
};

const updateClinicMemberRole = async (
  actorId: string,
  clinicId: string,
  memberId: string,
  role: ClinicRole
) => {
  // Verify clinic exists
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  // Verify actor permissions
  const actorMember = await prisma.clinicMember.findFirst({
    where: {
      clinicId: clinicId,
      userId: actorId,
    },
  });

  if (!actorMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not a member of this clinic"
    );
  }

  // Only admins can change roles
  const isAdmin = actorMember.role === "admin" || actorMember.role === "superAdmin";
  if (!isAdmin) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only admins can change member roles"
    );
  }

  // Find the member to update
  const member = await prisma.clinicMember.findUnique({
    where: { id: memberId },
    include: {
      clinic: true,
    },
  });

  if (!member) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic member not found");
  }

  // Verify member belongs to the same clinic
  if (member.clinicId !== clinicId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Member does not belong to your clinic"
    );
  }

  // Only superAdmin can change role to/from admin
  if (
    (role === "admin" || member.role === "admin") &&
    actorMember.role !== "superAdmin"
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only Super Admins can modify Admin roles"
    );
  }

  // Prevent modifying clinic owner role
  if (member.userId === clinic.ownerId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot modify clinic owner role"
    );
  }

  // Update the member role
  const updatedMember = await prisma.clinicMember.update({
    where: { id: memberId },
    data: { role },
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

  return updatedMember;
};

const getCliniciansByToken = async (token: string, options: any) => {
  const { limit = 10, page = 1, sort = { createdAt: "desc" } } = options;

  // Find the clinic by public token
  const clinic = await prisma.clinic.findFirst({
    where: { publicToken: token },
  });

  if (!clinic) {
    throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
  }

  // Get all clinicians for this clinic
  const [clinicians, totalDocs] = await Promise.all([
    prisma.clinicMember.findMany({
      where: {
        clinicId: clinic.id,
        role: "clinician",
      },
      select: {
        id: true,
        role: true,
        availability: true,
        specialization: true,
        clinicianToken: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
          },
        },
      },
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: sort,
    }),
    prisma.clinicMember.count({
      where: {
        clinicId: clinic.id,
        role: "clinician",
      },
    }),
  ]);

  return {
    clinic: {
      id: clinic.id,
      name: clinic.name,
      email: clinic.email,
      phoneNumber: clinic.phoneNumber,
      address: clinic.address,
      logo: clinic.logo,
    },
    clinicians: {
      docs: clinicians,
      totalDocs,
      limit: Number(limit),
      page: Number(page),
      totalPages: Math.ceil(totalDocs / Number(limit)),
    },
  };
};

export default {
  addClinicMember,
  getClinicMembers,
  removeClinicMember,
  updateClinicMember,
  updateClinicMemberRole,
  getCliniciansByToken,
};
