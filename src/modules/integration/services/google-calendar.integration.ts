import { google } from "googleapis";
import {
  getIntegrationConfig,
  updateIntegrationConfig,
  isTokenExpired,
  handleApiError,
  retryWithBackoff,
} from "../integration.helper";
import { IntegrationType } from "../../../../generated/prisma/client";
import env from "../../../configs/env";

const INTEGRATION_TYPE = IntegrationType.google_calendar;

/**
 * Get OAuth2 client for a clinic
 */
const getOAuth2Client = async (clinicId: string) => {
  const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);

  const oauth2Client = new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri
  );

  oauth2Client.setCredentials({
    access_token: config.accessToken,
    refresh_token: config.refreshToken,
  });

  // Auto-refresh token if expired
  if (config.expiresAt && isTokenExpired(config.expiresAt)) {
    await refreshAccessToken(clinicId);
    const newConfig = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    oauth2Client.setCredentials({
      access_token: newConfig.accessToken,
      refresh_token: newConfig.refreshToken,
    });
  }

  return oauth2Client;
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (clinicId: string): Promise<void> => {
  try {
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);

    const oauth2Client = new google.auth.OAuth2(
      env.google.clientId,
      env.google.clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    await updateIntegrationConfig(clinicId, INTEGRATION_TYPE, {
      ...config,
      accessToken: credentials.access_token,
      expiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : null,
    });
  } catch (error: any) {
    handleApiError(error, "Google Calendar");
  }
};

/**
 * Create calendar event from appointment
 */
const createCalendarEvent = async (
  clinicId: string,
  appointmentData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees?: string[];
    location?: string;
  }
): Promise<{ eventId: string; htmlLink: string }> => {
  try {
    const oauth2Client = await getOAuth2Client(clinicId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const calendarId = config.calendarId || "primary";

    const event = {
      summary: appointmentData.title,
      description: appointmentData.description,
      location: appointmentData.location,
      start: {
        dateTime: appointmentData.startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: appointmentData.endTime.toISOString(),
        timeZone: "UTC",
      },
      attendees: appointmentData.attendees?.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    const response = await retryWithBackoff(() =>
      calendar.events.insert({
        calendarId,
        requestBody: event,
      })
    );

    return {
      eventId: response.data.id!,
      htmlLink: response.data.htmlLink!,
    };
  } catch (error: any) {
    handleApiError(error, "Google Calendar");
    return { eventId: "", htmlLink: "" };
  }
};

/**
 * Update calendar event
 */
const updateCalendarEvent = async (
  clinicId: string,
  eventId: string,
  updates: {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
    attendees?: string[];
    location?: string;
  }
): Promise<void> => {
  try {
    const oauth2Client = await getOAuth2Client(clinicId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const calendarId = config.calendarId || "primary";

    const event: any = {};

    if (updates.title) event.summary = updates.title;
    if (updates.description) event.description = updates.description;
    if (updates.location) event.location = updates.location;
    if (updates.startTime) {
      event.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: "UTC",
      };
    }
    if (updates.endTime) {
      event.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: "UTC",
      };
    }
    if (updates.attendees) {
      event.attendees = updates.attendees.map((email) => ({ email }));
    }

    await retryWithBackoff(() =>
      calendar.events.patch({
        calendarId,
        eventId,
        requestBody: event,
      })
    );
  } catch (error: any) {
    handleApiError(error, "Google Calendar");
  }
};

/**
 * Delete calendar event
 */
const deleteCalendarEvent = async (
  clinicId: string,
  eventId: string
): Promise<void> => {
  try {
    const oauth2Client = await getOAuth2Client(clinicId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const calendarId = config.calendarId || "primary";

    await retryWithBackoff(() =>
      calendar.events.delete({
        calendarId,
        eventId,
      })
    );
  } catch (error: any) {
    // Ignore 404 errors (event already deleted)
    if (error.response?.status === 404) {
      return;
    }
    handleApiError(error, "Google Calendar");
  }
};

/**
 * Get calendar event
 */
const getCalendarEvent = async (
  clinicId: string,
  eventId: string
): Promise<any> => {
  try {
    const oauth2Client = await getOAuth2Client(clinicId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const calendarId = config.calendarId || "primary";

    const response = await retryWithBackoff(() =>
      calendar.events.get({
        calendarId,
        eventId,
      })
    );

    return response.data;
  } catch (error: any) {
    handleApiError(error, "Google Calendar");
  }
};

export default {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  refreshAccessToken,
};
