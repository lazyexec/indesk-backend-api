import { PlanType } from "../../../generated/prisma/client";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

const createPlan = async (data: {
  name: string;
  type: PlanType;
  description?: string;
  price: number;
  clientLimit: number;
  clinicianLimit?: number;
  features: Record<string, boolean>;
}) => {
  // Validate that plan type doesn't already exist
  const existingPlan = await prisma.plan.findUnique({
    where: { type: data.type }
  });

  if (existingPlan) {
    throw new ApiError(httpStatus.CONFLICT, `Plan with type ${data.type} already exists`);
  }

  // Validate client limit
  if (data.clientLimit < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Client limit cannot be negative");
  }

  // Validate clinician limit
  if (data.clinicianLimit !== undefined && data.clinicianLimit < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Clinician limit cannot be negative");
  }

  // Validate price
  if (data.price < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Price cannot be negative");
  }

  return await prisma.plan.create({
    data: {
      name: data.name,
      type: data.type,
      description: data.description,
      price: data.price,
      clientLimit: data.clientLimit,
      clinicianLimit: data.clinicianLimit || 0,
      features: data.features,
    }
  });
};

const getAllPlans = async (includeInactive = false) => {
  return await prisma.plan.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { price: 'asc' }
  });
};

const getPlanById = async (id: string) => {
  const plan = await prisma.plan.findUnique({
    where: { id }
  });

  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  }

  return plan;
};

const getPlanByType = async (type: PlanType) => {
  const plan = await prisma.plan.findUnique({
    where: { type }
  });

  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, `Plan with type ${type} not found`);
  }

  return plan;
};

const updatePlan = async (id: string, data: {
  name?: string;
  description?: string;
  price?: number;
  clientLimit?: number;
  clinicianLimit?: number;
  features?: Record<string, boolean>;
  isActive?: boolean;
}) => {
  // Check if plan exists
  await getPlanById(id);

  // Validate client limit if provided
  if (data.clientLimit !== undefined && data.clientLimit < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Client limit cannot be negative");
  }

  // Validate clinician limit if provided
  if (data.clinicianLimit !== undefined && data.clinicianLimit < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Clinician limit cannot be negative");
  }

  // Validate price if provided
  if (data.price !== undefined && data.price < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Price cannot be negative");
  }

  return await prisma.plan.update({
    where: { id },
    data
  });
};

const togglePlanStatus = async (id: string, isActive: boolean) => {
  return await updatePlan(id, { isActive });
};

const checkFeatureAccess = async (planId: string, feature: string): Promise<boolean> => {
  const plan = await getPlanById(planId);
  const features = plan.features as Record<string, boolean>;
  return features[feature] === true;
};

const getPlanWithStats = async (id: string) => {
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          subscriptions: true
        }
      }
    }
  });

  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  }

  return plan;
};

export default {
  createPlan,
  getAllPlans,
  getPlanById,
  getPlanByType,
  updatePlan,
  togglePlanStatus,
  checkFeatureAccess,
  getPlanWithStats,
};