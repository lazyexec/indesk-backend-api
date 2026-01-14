// Base config for all integrations
interface BaseIntegrationConfig {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  email: string;
  connectedAt: Date;
  lastSyncAt?: Date;
}

// Google Calendar specific
interface GoogleCalendarConfig extends BaseIntegrationConfig {
  type: 'GOOGLE_CALENDAR';
  calendarId?: string;
}

// Stripe specific
interface StripeConfig extends BaseIntegrationConfig {
  type: 'STRIPE';
  stripeUserId: string;
  publishableKey: string;
  accountType: 'express' | 'standard' | 'custom';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

// Xero specific
interface XeroConfig extends BaseIntegrationConfig {
  type: 'XERO';
  tenantId: string;
  tenantName: string;
  idToken?: string;
}

// WhatsApp specific
interface WhatsAppConfig extends BaseIntegrationConfig {
  type: 'WHATSAPP';
  phoneNumberId: string;
  wabaId: string;
  phoneNumber: string;
  displayName: string;
  qualityRating: 'GREEN' | 'YELLOW' | 'RED';
  verified: boolean;
  messagingLimit: string;
}

// Zoom specific
interface ZoomConfig extends BaseIntegrationConfig {
  type: 'ZOOM';
  zoomUserId: string;
  accountId: string;
  accountType: 'Basic' | 'Pro' | 'Business';
}

// Union type for all configs
type IntegrationConfig = 
  | GoogleCalendarConfig 
  | StripeConfig 
  | XeroConfig 
  | WhatsAppConfig 
  | ZoomConfig;

export interface IIntegration {
  id: string;
  clinicId: string;
  type: string;
  status: string;
  config: IntegrationConfig;
  isConfigured: boolean;
  createdAt: Date;
  updatedAt: Date;
}