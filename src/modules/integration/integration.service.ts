import prisma from "../../configs/prisma";
import {
  IntegrationType,
  IntegrationStatus,
  Prisma,
} from "@prisma/client";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import {
  getIntegrationMetadata,
  getAllIntegrationMetadata,
} from "./integration.metadata";
import env from "../../configs/env";

/**
 * Get all integrations for a clinic with metadata and health status
 * @param {string} clinicId
 * @returns {Promise<any[]>}
 */
const getIntegrations = async (clinicId: string) => {
  const integrations = await prisma.integration.findMany({
    where: { clinicId },
  });

  // Get all integration metadata
  const allMetadata = getAllIntegrationMetadata();

  const integrationsWithHealth = await Promise.all(
    allMetadata.map(async (metadata) => {
      const existing = integrations.find((i) => i.type === metadata.type);
      let healthStatus = null;
      let lastHealthCheck = null;

      // Check health for connected integrations
      if (existing && existing.status === IntegrationStatus.connected) {
        try {
          const health = await checkIntegrationHealth(clinicId, metadata.type);
          healthStatus = health.status;
          lastHealthCheck = health.lastChecked;
        } catch (error) {
          healthStatus = 'error';
          lastHealthCheck = new Date();
        }
      }

      return {
        id: existing?.id || null,
        type: metadata.type,
        name: metadata.name,
        description: metadata.description,
        icon: metadata.icon,
        category: metadata.category,
        status: existing?.status || IntegrationStatus.disconnected,
        isConfigured: existing?.isConfigured || false,
        requiresOAuth: metadata.requiresOAuth,
        oauthUrl: metadata.oauthUrl || null,
        healthStatus,
        lastHealthCheck,
        updatedAt: existing?.updatedAt || null,
        createdAt: existing?.createdAt || null,
        requiredEnvVars: metadata.requiredEnvVars || [],
        documentation: metadata.documentation || null,
      };
    })
  );

  return integrationsWithHealth;
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
      const googleClientId = env.google.clientId;
      const redirectUri = env.google.redirectUri;
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent(
        "https://www.googleapis.com/auth/calendar"
      )}&access_type=offline&prompt=consent&state=${state}`;

    case "zoom":
      // Zoom OAuth URL
      const zoomClientId = env.zoom.clientId;
      const zoomRedirectUri = `${env.BACKEND_URL}/api/v1/integration/oauth/callback/zoom`;
      return `https://zoom.us/oauth/authorize?response_type=code&client_id=${zoomClientId}&redirect_uri=${encodeURIComponent(
        zoomRedirectUri
      )}&state=${state}`;

    case "xero":
      // Xero OAuth URL
      const xeroClientId = env.xero.clientId;
      const xeroRedirectUri = `${env.BACKEND_URL}/api/v1/integration/oauth/callback/xero`;
      return `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${xeroClientId}&redirect_uri=${encodeURIComponent(
        xeroRedirectUri
      )}&scope=${encodeURIComponent(
        "accounting.transactions accounting.settings"
      )}&state=${state}`;

    case "stripe":
      // Stripe Connect OAuth URL
      const stripeClientId = env.stripeConnect.clientId;
      if (!stripeClientId) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Stripe Connect client ID not configured"
        );
      }
      const stripeRedirectUri = `${env.BACKEND_URL}/api/v1/integration/oauth/callback/stripe`;
      return `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${stripeClientId}&scope=read_write&redirect_uri=${encodeURIComponent(
        stripeRedirectUri
      )}&state=${state}`;

    case "mailchimp":
      // Mailchimp OAuth URL
      const mailchimpClientId = env.mailchimp.oauth.clientId;
      if (!mailchimpClientId) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Mailchimp client ID not configured"
        );
      }
      const mailchimpRedirectUri = `${env.BACKEND_URL}/api/v1/integration/oauth/callback/mailchimp`;
      return `https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=${mailchimpClientId}&redirect_uri=${encodeURIComponent(
        mailchimpRedirectUri
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
      if (!env.google.clientId || !env.google.clientSecret) {
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
            client_id: env.google.clientId,
            client_secret: env.google.clientSecret,
            redirect_uri: env.google.redirectUri,
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
      if (!env.zoom.clientId || !env.zoom.clientSecret) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Zoom OAuth credentials not configured"
        );
      }
      const zoomResponse = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${env.zoom.clientId}:${env.zoom.clientSecret}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: `${env.BACKEND_URL}/api/v1/integration/oauth/callback/zoom`,
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
      if (!env.xero.clientId || !env.xero.clientSecret) {
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
              `${env.xero.clientId}:${env.xero.clientSecret}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: `${env.BACKEND_URL}/api/v1/integration/oauth/callback/xero`,
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

    case "stripe":
      // Exchange Stripe Connect OAuth code for tokens
      if (!env.stripeConnect.clientId) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Stripe Connect credentials not configured"
        );
      }
      const stripeResponse = await fetch(
        "https://connect.stripe.com/oauth/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_secret: env.stripe.secretKey,
            grant_type: "authorization_code",
          }),
        }
      );
      if (!stripeResponse.ok) {
        const error: any = await stripeResponse.json();
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          error.error_description || "Failed to exchange Stripe OAuth code"
        );
      }
      tokens = await stripeResponse.json();
      break;

    case "mailchimp":
      // Exchange Mailchimp OAuth code for tokens
      if (
        !env.mailchimp.oauth.clientId ||
        !env.mailchimp.oauth.clientSecret
      ) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Mailchimp OAuth credentials not configured"
        );
      }
      const mailchimpResponse = await fetch(
        "https://login.mailchimp.com/oauth2/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: env.mailchimp.oauth.clientId,
            client_secret: env.mailchimp.oauth.clientSecret,
            redirect_uri: `${env.BACKEND_URL}/api/v1/integration/oauth/callback/mailchimp`,
            code,
          }),
        }
      );
      if (!mailchimpResponse.ok) {
        const error: any = await mailchimpResponse.json();
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          error.error || "Failed to exchange Mailchimp OAuth code"
        );
      }
      tokens = await mailchimpResponse.json();
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
  const integrationConfig = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null,
    // Store additional data based on integration type
    ...(type === "stripe" && {
      stripeUserId: tokens.stripe_user_id,
      stripePublishableKey: tokens.stripe_publishable_key,
    }),
  };

  // Create or update integration via OAuth
  const integration = await prisma.integration.upsert({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
    update: {
      status: IntegrationStatus.connected,
      config: integrationConfig,
    },
    create: {
      clinicId,
      type,
      status: IntegrationStatus.connected,
      config: integrationConfig,
    },
  });

  const metadata = getIntegrationMetadata(type);

  // Remove sensitive config data from response
  const { config: _, ...integrationWithoutConfig } = integration;

  return {
    ...integrationWithoutConfig,
    name: metadata.name,
    description: metadata.description,
    icon: metadata.icon,
    category: metadata.category,
  };
};

/**
 * Check integration health and connectivity
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @returns {Promise<{status: string, lastChecked: Date, details?: any}>}
 */
const checkIntegrationHealth = async (clinicId: string, type: IntegrationType) => {
  const integration = await prisma.integration.findUnique({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
  });

  if (!integration || integration.status !== IntegrationStatus.connected) {
    return {
      status: 'disconnected',
      lastChecked: new Date(),
    };
  }

  const config = integration.config as any;
  let healthStatus = 'healthy';
  let details: any = {};

  try {
    switch (type) {
      case 'google_calendar':
        // Check Google Calendar API access
        if (config.accessToken) {
          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary',
            {
              headers: {
                Authorization: `Bearer ${config.accessToken}`,
              },
            }
          );
          if (!response.ok) {
            healthStatus = 'error';
            details.error = 'Failed to access Google Calendar API';
          }
        }
        break;

      case 'stripe':
        // Check Stripe account status
        if (config.stripeUserId) {
          // Note: In production, you'd use Stripe SDK to check account status
          details.accountId = config.stripeUserId;
          details.publishableKey = config.stripePublishableKey ? 'configured' : 'missing';
        }
        break;

      case 'zoom':
        // Check Zoom API access
        if (config.accessToken) {
          const response = await fetch('https://api.zoom.us/v2/users/me', {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
            },
          });
          if (!response.ok) {
            healthStatus = 'error';
            details.error = 'Failed to access Zoom API';
          }
        }
        break;

      case 'mailchimp':
        // Check Mailchimp API access
        if (config.accessToken) {
          const response = await fetch('https://us1.api.mailchimp.com/3.0/lists', {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
            },
          });
          if (!response.ok) {
            healthStatus = 'error';
            details.error = 'Failed to access Mailchimp API';
          }
        }
        break;

      case 'xero':
        // Check Xero API access
        if (config.accessToken) {
          const response = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
            },
          });
          if (!response.ok) {
            healthStatus = 'error';
            details.error = 'Failed to access Xero API';
          }
        }
        break;
    }

    // Check token expiration
    if (config.expiresAt && new Date(config.expiresAt) < new Date()) {
      healthStatus = 'expired';
      details.tokenExpired = true;
    }

  } catch (error: any) {
    healthStatus = 'error';
    details.error = error.message;
  }

  return {
    status: healthStatus,
    lastChecked: new Date(),
    details,
  };
};

/**
 * Update integration configuration
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @param {any} configData
 * @returns {Promise<any>}
 */
const updateIntegrationConfig = async (
  clinicId: string,
  type: IntegrationType,
  configData: any
) => {
  // Update integration
  const integration = await prisma.integration.upsert({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
    update: {
      config: configData,
      isConfigured: true,
      updatedAt: new Date(),
    },
    create: {
      clinicId,
      type,
      status: IntegrationStatus.disconnected,
      config: configData,
      isConfigured: true,
    },
  });

  const metadata = getIntegrationMetadata(type);

  // Remove sensitive config data from response
  const { config: _, ...integrationWithoutConfig } = integration;

  return {
    ...integrationWithoutConfig,
    name: metadata.name,
    description: metadata.description,
    icon: metadata.icon,
    category: metadata.category,
  };
};

/**
 * Disconnect integration
 * @param {string} clinicId
 * @param {IntegrationType} type
 * @returns {Promise<any>}
 */
const disconnectIntegration = async (clinicId: string, type: IntegrationType) => {
  const integration = await prisma.integration.findUnique({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
  });

  if (!integration) {
    throw new ApiError(httpStatus.NOT_FOUND, "Integration not found");
  }

  // Update status to disconnected but keep configuration
  const updatedIntegration = await prisma.integration.update({
    where: {
      clinicId_type: {
        clinicId,
        type,
      },
    },
    data: {
      status: IntegrationStatus.disconnected,
      config: {}, // Clear sensitive data
      updatedAt: new Date(),
    },
  });

  const metadata = getIntegrationMetadata(type);

  // Remove sensitive config data from response (already cleared in DB)
  const { config: _, ...integrationWithoutConfig } = updatedIntegration;

  return {
    ...integrationWithoutConfig,
    name: metadata.name,
    description: metadata.description,
    icon: metadata.icon,
    category: metadata.category,
  };
};

/**
 * Get integration setup guide
 * @param {IntegrationType} type
 * @returns {any}
 */
const getIntegrationSetupGuide = (type: IntegrationType) => {
  const metadata = getIntegrationMetadata(type);

  return {
    type,
    name: metadata.name,
    description: metadata.description,
    icon: metadata.icon,
    category: metadata.category,
    requiresOAuth: metadata.requiresOAuth,
    requiredEnvVars: metadata.requiredEnvVars || [],
    documentation: metadata.documentation || null,
  };
};

export default {
  getIntegrations,
  getOAuthUrl,
  handleOAuthCallback,
  checkIntegrationHealth,
  updateIntegrationConfig,
  disconnectIntegration,
  getIntegrationSetupGuide,
};
