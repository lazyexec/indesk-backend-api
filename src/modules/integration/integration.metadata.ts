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
      placeholder?: string;
      helpText?: string;
    }>;
  };
  setupSteps?: Array<{
    step: number;
    title: string;
    description: string;
    action?: string;
  }>;
  requiredEnvVars?: string[];
  documentation?: string;
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
            placeholder: "primary or calendar@gmail.com",
            helpText: "Use 'primary' for your main calendar or the specific calendar ID",
          },
          {
            key: "syncDirection",
            label: "Sync Direction",
            type: "select",
            required: true,
            options: ["both", "to_google", "from_google"],
            helpText: "Choose how appointments should sync between InDesk and Google Calendar",
          },
        ],
      },
      setupSteps: [
        {
          step: 1,
          title: "Enable Google Calendar API",
          description: "Go to Google Cloud Console and enable the Calendar API for your project",
        },
        {
          step: 2,
          title: "Connect Your Account",
          description: "Click the Connect button to authorize InDesk to access your Google Calendar",
          action: "oauth",
        },
        {
          step: 3,
          title: "Configure Settings",
          description: "Select which calendar to sync and set your sync preferences",
        },
      ],
      requiredEnvVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      documentation: "https://developers.google.com/calendar/api/quickstart",
    },
    stripe: {
      type: "stripe",
      name: "Stripe",
      description:
        "Process payments and manage subscriptions via Stripe Connect",
      icon: "💳",
      category: "payment",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/stripe",
      setupSteps: [
        {
          step: 1,
          title: "Create Stripe Account",
          description: "Sign up for a Stripe account if you don't have one already",
        },
        {
          step: 2,
          title: "Connect via Stripe Connect",
          description: "Click Connect to link your Stripe account with InDesk",
          action: "oauth",
        },
        {
          step: 3,
          title: "Complete Account Setup",
          description: "Complete your Stripe account verification to start accepting payments",
        },
      ],
      requiredEnvVars: ["STRIPE_CONNECT_CLIENT_ID"],
      documentation: "https://stripe.com/docs/connect",
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
            helpText: "Your Xero organization's tenant ID",
          },
          {
            key: "organizationId",
            label: "Organization ID",
            type: "text",
            required: false,
            helpText: "Optional: Specific organization ID if you have multiple",
          },
        ],
      },
      setupSteps: [
        {
          step: 1,
          title: "Create Xero App",
          description: "Create an app in the Xero Developer Portal",
        },
        {
          step: 2,
          title: "Connect Your Account",
          description: "Authorize InDesk to access your Xero organization",
          action: "oauth",
        },
        {
          step: 3,
          title: "Configure Organization",
          description: "Select which Xero organization to sync with",
        },
      ],
      requiredEnvVars: ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET"],
      documentation: "https://developer.xero.com/documentation/",
    },
    mailchimp: {
      type: "mailchimp",
      name: "Mailchimp",
      description: "Send newsletters and campaigns",
      icon: "📧",
      category: "marketing",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/mailchimp",
      configSchema: {
        fields: [
          {
            key: "audienceId",
            label: "Audience/List ID",
            type: "text",
            required: false,
            placeholder: "e.g., 1a2b3c4d5e",
            helpText: "The ID of the Mailchimp audience to sync contacts with",
          },
        ],
      },
      setupSteps: [
        {
          step: 1,
          title: "Create Mailchimp Account",
          description: "Sign up for Mailchimp if you don't have an account",
        },
        {
          step: 2,
          title: "Connect Your Account",
          description: "Authorize InDesk to access your Mailchimp account",
          action: "oauth",
        },
        {
          step: 3,
          title: "Select Audience",
          description: "Choose which Mailchimp audience to sync your clients with",
        },
      ],
      requiredEnvVars: ["MAILCHIMP_CLIENT_ID", "MAILCHIMP_CLIENT_SECRET"],
      documentation: "https://mailchimp.com/developer/",
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
            helpText: "Your Zoom account ID from the Zoom Marketplace",
          },
          {
            key: "clientId",
            label: "Client ID",
            type: "text",
            required: true,
            helpText: "OAuth client ID from your Zoom app",
          },
          {
            key: "clientSecret",
            label: "Client Secret",
            type: "password",
            required: true,
            helpText: "OAuth client secret from your Zoom app",
          },
        ],
      },
      setupSteps: [
        {
          step: 1,
          title: "Create Zoom App",
          description: "Create an OAuth app in the Zoom Marketplace",
        },
        {
          step: 2,
          title: "Connect Your Account",
          description: "Authorize InDesk to create meetings on your behalf",
          action: "oauth",
        },
        {
          step: 3,
          title: "Configure Settings",
          description: "Set up your account details and meeting preferences",
        },
      ],
      requiredEnvVars: ["ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"],
      documentation: "https://marketplace.zoom.us/docs/guides",
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
