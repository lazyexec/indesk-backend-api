import prisma from "../../configs/prisma";
import {
  IntegrationType,
  IntegrationStatus,
} from "../../../generated/prisma/client";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

/**
 * Get integration config for a clinic
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @returns {Promise<any>}
 */
export const getIntegrationConfig = async (
  clinicId: string,
  type: IntegrationType
): Promise<any> => {
  const integration = await prisma.integration.findUnique({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
  });

  if (!integration) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `${type} integration not found for this clinic`
    );
  }

  if (integration.status !== IntegrationStatus.connected) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${type} integration is not connected. Please connect it first.`
    );
  }

  if (!integration.config) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${type} integration has no configuration`
    );
  }

  return integration.config;
};

/**
 * Check if integration is connected for a clinic
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @returns {Promise<boolean>}
 */
export const isIntegrationConnected = async (
  clinicId: string,
  type: IntegrationType
): Promise<boolean> => {
  const integration = await prisma.integration.findUnique({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
  });

  return integration?.status === IntegrationStatus.connected;
};

/**
 * Update integration config
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @param {any} config
 */
export const updateIntegrationConfig = async (
  clinicId: string,
  type: IntegrationType,
  config: any
): Promise<void> => {
  await prisma.integration.update({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
    data: {
      config,
    },
  });
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn
 * @param {number} maxRetries
 * @returns {Promise<any>}
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Wait with exponential backoff
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

/**
 * Handle API errors consistently
 * @param {any} error
 * @param {string} integrationType
 */
export const handleApiError = (error: any, integrationType: string): never => {
  console.error(`${integrationType} API Error:`, error);

  if (error.response) {
    // API responded with error
    const status = error.response.status;
    const message =
      error.response.data?.message ||
      error.response.data?.error ||
      error.message;

    if (status === 401 || status === 403) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        `${integrationType} authentication failed. Please reconnect the integration.`
      );
    }

    if (status === 429) {
      throw new ApiError(
        httpStatus.TOO_MANY_REQUESTS,
        `${integrationType} rate limit exceeded. Please try again later.`
      );
    }

    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${integrationType} API error: ${message}`
    );
  }

  // Network or other error
  throw new ApiError(
    httpStatus.INTERNAL_SERVER_ERROR,
    `${integrationType} integration error: ${error.message}`
  );
};

/**
 * Check if token is expired or about to expire
 * @param {Date | string} expiresAt
 * @param {number} bufferMinutes - Refresh if expires within this many minutes
 * @returns {boolean}
 */
export const isTokenExpired = (
  expiresAt: Date | string,
  bufferMinutes: number = 5
): boolean => {
  const expiryDate =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const bufferMs = bufferMinutes * 60 * 1000;
  return Date.now() + bufferMs >= expiryDate.getTime();
};
