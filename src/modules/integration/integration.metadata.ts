import { IntegrationType } from "../../../generated/prisma/client";

export interface IntegrationMetadata {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  category:
    | "calendar"
    | "payment"
    | "communication"
    | "accounting"
    | "marketing";
  requiresOAuth: boolean;
  oauthUrl?: string;
  configSchema?: {
    fields: Array<{
      key: string;
      label: string;
      type: "text" | "password" | "select" | "textarea";
      required: boolean;
      options?: string[];
    }>;
  };
}

export const integrationMetadata: Record<IntegrationType, IntegrationMetadata> =
  {
    google_calendar: {
      type: "google_calendar",
      name: "Google Calendar",
      description: "Sync appointments and availability with Google Calendar",
      icon: "📅",
      category: "calendar",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/google_calendar",
      configSchema: {
        fields: [
          {
            key: "calendarId",
            label: "Calendar ID",
            type: "text",
            required: true,
          },
          {
            key: "syncDirection",
            label: "Sync Direction",
            type: "select",
            required: true,
            options: ["both", "to_google", "from_google"],
          },
        ],
      },
    },
    stripe: {
      type: "stripe",
      name: "Stripe",
      description: "Process payments and manage subscriptions",
      icon: "💳",
      category: "payment",
      requiresOAuth: false,
      configSchema: {
        fields: [
          {
            key: "publishableKey",
            label: "Publishable Key",
            type: "text",
            required: true,
          },
          {
            key: "secretKey",
            label: "Secret Key",
            type: "password",
            required: true,
          },
          {
            key: "webhookSecret",
            label: "Webhook Secret",
            type: "password",
            required: false,
          },
        ],
      },
    },
    xero: {
      type: "xero",
      name: "Xero",
      description: "Sync invoices and financial data",
      icon: "📊",
      category: "accounting",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/xero",
      configSchema: {
        fields: [
          {
            key: "tenantId",
            label: "Tenant ID",
            type: "text",
            required: true,
          },
          {
            key: "organizationId",
            label: "Organization ID",
            type: "text",
            required: false,
          },
        ],
      },
    },
    mailchimp: {
      type: "mailchimp",
      name: "Mailchimp",
      description: "Send newsletters and campaigns",
      icon: "📧",
      category: "marketing",
      requiresOAuth: false,
      configSchema: {
        fields: [
          {
            key: "apiKey",
            label: "API Key",
            type: "password",
            required: true,
          },
          {
            key: "serverPrefix",
            label: "Server Prefix (e.g., us1, us2)",
            type: "text",
            required: true,
          },
          {
            key: "audienceId",
            label: "Audience/List ID",
            type: "text",
            required: false,
          },
        ],
      },
    },
    whatsapp: {
      type: "whatsapp",
      name: "WhatsApp Business",
      description: "Send automated reminders via WhatsApp",
      icon: "💬",
      category: "communication",
      requiresOAuth: false,
      configSchema: {
        fields: [
          {
            key: "apiKey",
            label: "API Key",
            type: "password",
            required: true,
          },
          {
            key: "phoneNumberId",
            label: "Phone Number ID",
            type: "text",
            required: true,
          },
          {
            key: "businessAccountId",
            label: "Business Account ID",
            type: "text",
            required: true,
          },
          {
            key: "webhookVerifyToken",
            label: "Webhook Verify Token",
            type: "password",
            required: false,
          },
        ],
      },
    },
    zoom: {
      type: "zoom",
      name: "Zoom",
      description: "Generate video links for telehealth",
      icon: "🎥",
      category: "communication",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/zoom",
      configSchema: {
        fields: [
          {
            key: "accountId",
            label: "Account ID",
            type: "text",
            required: true,
          },
          {
            key: "clientId",
            label: "Client ID",
            type: "text",
            required: true,
          },
          {
            key: "clientSecret",
            label: "Client Secret",
            type: "password",
            required: true,
          },
        ],
      },
    },
  };

export const getIntegrationMetadata = (
  type: IntegrationType
): IntegrationMetadata => {
  return integrationMetadata[type];
};

export const getAllIntegrationMetadata = (): IntegrationMetadata[] => {
  return Object.values(integrationMetadata);
};
