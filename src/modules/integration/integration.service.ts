import prisma from "../../configs/prisma";
import {
  IntegrationType,
  IntegrationStatus,
  Prisma,
} from "../../../generated/prisma/client";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import {
  getIntegrationMetadata,
  getAllIntegrationMetadata,
} from "./integration.metadata";

/**
 * Get all integrations for a clinic with metadata
 * @param {string} clinicId
 * @returns {Promise<any[]>}
 */
const getIntegrations = async (clinicId: string) => {
  const integrations = await prisma.integration.findMany({
    where: { clinicId },
  });

  // Get all integration metadata
  const allMetadata = getAllIntegrationMetadata();

  return allMetadata.map((metadata) => {
    const existing = integrations.find((i) => i.type === metadata.type);
    return {
      id: existing?.id || null,
      type: metadata.type,
      name: metadata.name,
      description: metadata.description,
      icon: metadata.icon,
      category: metadata.category,
      status: existing?.status || IntegrationStatus.disconnected,
      config: existing?.config || null,
      requiresOAuth: metadata.requiresOAuth,
      oauthUrl: metadata.oauthUrl || null,
      configSchema: metadata.configSchema || null,
      updatedAt: existing?.updatedAt || null,
      createdAt: existing?.createdAt || null,
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
  // Validate config based on integration type
  validateIntegrationConfig(type, config);

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

  const metadata = getIntegrationMetadata(type);

  return {
    ...integration,
    name: metadata.name,
    description: metadata.description,
    icon: metadata.icon,
    category: metadata.category,
  };
};

/**
 * Validate integration config based on type
 * @param {IntegrationType} type
 * @param {any} config
 */
const validateIntegrationConfig = (type: IntegrationType, config: any) => {
  if (!config || typeof config !== "object") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid configuration provided"
    );
  }

  const metadata = getIntegrationMetadata(type);

  if (metadata.configSchema) {
    for (const field of metadata.configSchema.fields) {
      if (field.required && !config[field.key]) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `${field.label} is required for ${metadata.name} integration`
        );
      }
    }
  }

  // Type-specific validation
  switch (type) {
    case "stripe":
      if (config.secretKey && !config.secretKey.startsWith("sk_")) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Invalid Stripe secret key format"
        );
      }
      break;
    case "mailchimp":
      if (config.serverPrefix && !/^[a-z]{2}\d+$/.test(config.serverPrefix)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Invalid Mailchimp server prefix format (e.g., us1, us2)"
        );
      }
      break;
    case "whatsapp":
      if (config.phoneNumberId && !/^\d+$/.test(config.phoneNumberId)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Invalid WhatsApp Phone Number ID format"
        );
      }
      break;
  }
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

  const metadata = getIntegrationMetadata(type);

  return {
    ...integration,
    name: metadata.name,
    description: metadata.description,
    icon: metadata.icon,
    category: metadata.category,
  };
};

/**
 * Update integration settings
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @param {any} config
 * @returns {Promise<any>}
 */
const updateIntegrationSettings = async (
  clinicId: string,
  type: IntegrationType,
  config: any
) => {
  // Check if integration exists and is connected
  const existing = await prisma.integration.findUnique({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
  });

  if (!existing || existing.status !== IntegrationStatus.connected) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Integration is not connected. Please connect it first."
    );
  }

  // Validate config
  validateIntegrationConfig(type, config);

  // Merge with existing config
  const existingConfig = (existing.config as any) || {};
  const mergedConfig = { ...existingConfig, ...config };

  const integration = await prisma.integration.update({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
    data: {
      config: mergedConfig,
    },
  });

  const metadata = getIntegrationMetadata(type);

  return {
    ...integration,
    name: metadata.name,
    description: metadata.description,
    icon: metadata.icon,
    category: metadata.category,
  };
};

/**
 * Get OAuth URL for integration
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @returns {Promise<string>}
 */
const getOAuthUrl = async (clinicId: string, type: IntegrationType) => {
  const metadata = getIntegrationMetadata(type);

  if (!metadata.requiresOAuth) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${metadata.name} does not require OAuth`
    );
  }

  // Generate state token for OAuth flow
  const state = Buffer.from(
    JSON.stringify({ clinicId, type, timestamp: Date.now() })
  ).toString("base64");

  // Return OAuth URL based on type
  switch (type) {
    case "google_calendar":
      // Google OAuth URL
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = `${process.env.BACKEND_URL}/api/v1/integration/oauth/callback/google_calendar`;
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent(
        "https://www.googleapis.com/auth/calendar"
      )}&access_type=offline&prompt=consent&state=${state}`;

    case "zoom":
      // Zoom OAuth URL
      const zoomClientId = process.env.ZOOM_CLIENT_ID;
      const zoomRedirectUri = `${process.env.BACKEND_URL}/api/v1/integration/oauth/callback/zoom`;
      return `https://zoom.us/oauth/authorize?response_type=code&client_id=${zoomClientId}&redirect_uri=${encodeURIComponent(
        zoomRedirectUri
      )}&state=${state}`;

    case "xero":
      // Xero OAuth URL
      const xeroClientId = process.env.XERO_CLIENT_ID;
      const xeroRedirectUri = `${process.env.BACKEND_URL}/api/v1/integration/oauth/callback/xero`;
      return `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${xeroClientId}&redirect_uri=${encodeURIComponent(
        xeroRedirectUri
      )}&scope=${encodeURIComponent(
        "accounting.transactions accounting.settings"
      )}&state=${state}`;

    default:
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "OAuth not implemented for this integration"
      );
  }
};

/**
 * Handle OAuth callback
 * @param {IntegrationType} type
 * @param {string} code
 * @param {string} state
 * @returns {Promise<any>}
 */
const handleOAuthCallback = async (
  type: IntegrationType,
  code: string,
  state: string
) => {
  // Decode state
  const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
  const { clinicId } = stateData;

  // Exchange code for tokens based on type
  let tokens: any = {};

  switch (type) {
    case "google_calendar":
      // Exchange Google OAuth code for tokens
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Google OAuth credentials not configured"
        );
      }
      const googleResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${process.env.BACKEND_URL}/api/v1/integration/oauth/callback/google_calendar`,
            grant_type: "authorization_code",
          }),
        }
      );
      if (!googleResponse.ok) {
        const error: any = await googleResponse.json();
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          error.error_description || "Failed to exchange Google OAuth code"
        );
      }
      tokens = await googleResponse.json();
      break;

    case "zoom":
      // Exchange Zoom OAuth code for tokens
      if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Zoom OAuth credentials not configured"
        );
      }
      const zoomResponse = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: `${process.env.BACKEND_URL}/api/v1/integration/oauth/callback/zoom`,
        }),
      });
      if (!zoomResponse.ok) {
        const error: any = await zoomResponse.json();
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          error.reason || "Failed to exchange Zoom OAuth code"
        );
      }
      tokens = await zoomResponse.json();
      break;

    case "xero":
      // Exchange Xero OAuth code for tokens
      if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Xero OAuth credentials not configured"
        );
      }
      const xeroResponse = await fetch(
        "https://identity.xero.com/connect/token",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: `${process.env.BACKEND_URL}/api/v1/integration/oauth/callback/xero`,
          }),
        }
      );
      if (!xeroResponse.ok) {
        const error: any = await xeroResponse.json();
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          error.error_description || "Failed to exchange Xero OAuth code"
        );
      }
      tokens = await xeroResponse.json();
      break;

    default:
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "OAuth callback not implemented for this integration"
      );
  }

  if (!tokens.access_token) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      tokens.error_description ||
        tokens.error ||
        "Failed to obtain access token"
    );
  }

  // Store tokens in config and connect integration
  const config = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null,
  };

  return await connectIntegration(clinicId, type, config);
};

export default {
  getIntegrations,
  connectIntegration,
  disconnectIntegration,
  updateIntegrationSettings,
  getOAuthUrl,
  handleOAuthCallback,
  validateIntegrationConfig,
};
