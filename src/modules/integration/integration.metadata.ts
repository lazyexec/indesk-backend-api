import { IntegrationType } from "@prisma/client";

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
    | "marketing"
    | "clinical";
  requiresOAuth: boolean;
  oauthUrl?: string;
  requiredEnvVars?: string[];
  documentation?: string;
  availability?: "available" | "coming_soon";
  comingSoonMessage?: string;
}

export const integrationMetadata: Record<IntegrationType, IntegrationMetadata> =
  {
    google_calendar: {
      type: "google_calendar",
      name: "Google Calendar",
      description: "Sync appointments and availability with Google Calendar",
      icon: "calendar",
      category: "calendar",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/google_calendar",
      requiredEnvVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      documentation: "https://developers.google.com/calendar/api/quickstart",
      availability: "available",
    },
    stripe: {
      type: "stripe",
      name: "Stripe",
      description: "Process payments and manage subscriptions",
      icon: "stripe",
      category: "payment",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/stripe",
      requiredEnvVars: ["STRIPE_CONNECT_CLIENT_ID", "STRIPE_SECRET_KEY"],
      documentation: "https://stripe.com/docs/connect",
      availability: "available",
    },
    mailchimp: {
      type: "mailchimp",
      name: "Mailchimp",
      description: "Send emails, newsletters, and campaigns",
      icon: "mailchimp",
      category: "marketing",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/mailchimp",
      requiredEnvVars: ["MAILCHIMP_CLIENT_ID", "MAILCHIMP_CLIENT_SECRET"],
      documentation: "https://mailchimp.com/developer/",
      availability: "available",
    },
    twilio: {
      type: "twilio",
      name: "Twilio",
      description: "Send SMS reminders and notifications",
      icon: "twilio",
      category: "communication",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/twilio",
      requiredEnvVars: ["TWILIO_CLIENT_ID", "TWILIO_CLIENT_SECRET"],
      documentation: "https://www.twilio.com/docs",
      availability: "available",
    },
    google_meet: {
      type: "google_meet",
      name: "Google Meet",
      description: "Generate Google Meet links for telehealth appointments",
      icon: "google_meet",
      category: "communication",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/google_meet",
      requiredEnvVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      documentation: "https://developers.google.com/meet",
      availability: "available",
    },
    zoom: {
      type: "zoom",
      name: "Zoom",
      description: "Generate video links for telehealth appointments",
      icon: "zoom",
      category: "communication",
      requiresOAuth: true,
      oauthUrl: "/api/v1/integration/oauth/zoom",
      requiredEnvVars: [
        "ZOOM_CLIENT_ID",
        "ZOOM_CLIENT_SECRET",
        "ZOOM_ACCOUNT_ID",
      ],
      documentation: "https://marketplace.zoom.us/docs/guides",
      availability: "available",
    },
    healthcode: {
      type: "healthcode",
      name: "Healthcode",
      description: "Healthcode integration is coming soon.",
      icon: "healthcode",
      category: "clinical",
      requiresOAuth: false,
      availability: "coming_soon",
      comingSoonMessage: "Coming Soon",
    },
    emdr: {
      type: "emdr",
      name: "EMDR",
      description: "EMDR integration is coming soon.",
      icon: "emdr",
      category: "clinical",
      requiresOAuth: false,
      availability: "coming_soon",
      comingSoonMessage: "Coming Soon",
    },
  };

export const getIntegrationMetadata = (
  type: IntegrationType,
): IntegrationMetadata => {
  return integrationMetadata[type];
};

export const getAllIntegrationMetadata = (): IntegrationMetadata[] => {
  return Object.values(integrationMetadata);
};
