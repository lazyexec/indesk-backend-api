import prisma from "../../configs/prisma";
import {
  IntegrationType,
  IntegrationStatus,
  Prisma,
} from "../../../generated/prisma/client";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

/**
 * Get all integrations for a clinic
 * @param {string} clinicId
 * @returns {Promise<any[]>}
 */
const getIntegrations = async (clinicId: string) => {
  const integrations = await prisma.integration.findMany({
    where: { clinicId },
  });

  // Return all possible integration types with their current status
  const allTypes = Object.values(IntegrationType);

  return allTypes.map((type) => {
    const existing = integrations.find((i) => i.type === type);
    return {
      type,
      status: existing?.status || IntegrationStatus.disconnected,
      config: existing?.config || null,
      updatedAt: existing?.updatedAt || null,
    };
  });
};

/**
 * Connect or update an integration
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @param {any} config
 * @returns {Promise<any>}
 */
const connectIntegration = async (
  clinicId: string,
  type: IntegrationType,
  config: any
) => {
  const integration = await prisma.integration.upsert({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
    update: {
      status: IntegrationStatus.connected,
      config,
    },
    create: {
      clinicId,
      type,
      status: IntegrationStatus.connected,
      config,
    },
  });

  return integration;
};

/**
 * Disconnect an integration
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @returns {Promise<any>}
 */
const disconnectIntegration = async (
  clinicId: string,
  type: IntegrationType
) => {
  const integration = await prisma.integration.update({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
    data: {
      status: IntegrationStatus.disconnected,
      config: Prisma.JsonNull, // Clear config on disconnect using Prisma's null type
    },
  });

  return integration;
};

export default {
  getIntegrations,
  connectIntegration,
  disconnectIntegration,
};
