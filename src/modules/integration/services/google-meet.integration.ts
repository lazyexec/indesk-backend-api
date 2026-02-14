/**
 * Google Meet Integration Service
 * Handles Google Meet meeting creation via Google Calendar API
 */

import { google } from "googleapis";
import prisma from "../../../configs/prisma";
import ApiError from "../../../utils/ApiError";
import httpStatus from "http-status";
import logger from "../../../utils/logger";

interface GoogleMeetMeetingOptions {
    topic: string;
    startTime: Date;
    duration: number; // in minutes
    agenda?: string;
    attendees?: string[];
}

interface GoogleMeetMeeting {
    meetingUrl: string;
    meetingId: string;
    eventId: string;
}

/**
 * Create a Google Meet meeting
 */
const createMeeting = async (
    clinicId: string,
    options: GoogleMeetMeetingOptions
): Promise<GoogleMeetMeeting> => {
    try {
        // Get Google Calendar integration
        const integration = await prisma.integration.findFirst({
            where: {
                clinicId,
                type: "google_meet",
                status: "connected",
            },
        });

        if (!integration || !integration.config) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Google Meet integration not configured"
            );
        }

        const config = integration.config as any;

        // Initialize OAuth2 client
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: config.accessToken,
            refresh_token: config.refreshToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Calculate end time
        const endTime = new Date(
            options.startTime.getTime() + options.duration * 60 * 1000
        );

        // Create calendar event with Google Meet
        const event = {
            summary: options.topic,
            description: options.agenda || "",
            start: {
                dateTime: options.startTime.toISOString(),
                timeZone: "UTC",
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: "UTC",
            },
            attendees: options.attendees?.map((email) => ({ email })) || [],
            conferenceData: {
                createRequest: {
                    requestId: `meet-${Date.now()}`,
                    conferenceSolutionKey: {
                        type: "hangoutsMeet",
                    },
                },
            },
        };

        const response = await calendar.events.insert({
            calendarId: "primary",
            requestBody: event,
            conferenceDataVersion: 1,
            sendUpdates: "all",
        });

        const meetingUrl =
            response.data.conferenceData?.entryPoints?.find(
                (ep) => ep.entryPointType === "video"
            )?.uri || "";

        const meetingId = response.data.conferenceData?.conferenceId || "";

        logger.info(`Google Meet created: ${meetingId}`);

        return {
            meetingUrl,
            meetingId,
            eventId: response.data.id || "",
        };
    } catch (error: any) {
        logger.error(`Failed to create Google Meet: ${error.message}`);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            `Failed to create Google Meet: ${error.message}`
        );
    }
};

/**
 * Delete a Google Meet meeting
 */
const deleteMeeting = async (
    clinicId: string,
    eventId: string
): Promise<void> => {
    try {
        const integration = await prisma.integration.findFirst({
            where: {
                clinicId,
                type: "google_meet",
                status: "connected",
            },
        });

        if (!integration || !integration.config) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Google Meet integration not configured"
            );
        }

        const config = integration.config as any;

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: config.accessToken,
            refresh_token: config.refreshToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        await calendar.events.delete({
            calendarId: "primary",
            eventId,
            sendUpdates: "all",
        });

        logger.info(`Google Meet deleted: ${eventId}`);
    } catch (error: any) {
        logger.error(`Failed to delete Google Meet: ${error.message}`);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            `Failed to delete Google Meet: ${error.message}`
        );
    }
};

export default {
    createMeeting,
    deleteMeeting,
};
