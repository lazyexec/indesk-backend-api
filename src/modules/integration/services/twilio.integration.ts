/**
 * Twilio Integration Service
 * Handles SMS sending via Twilio API
 */

import prisma from "../../../configs/prisma";
import ApiError from "../../../utils/ApiError";
import httpStatus from "http-status";
import logger from "../../../utils/logger";

interface SendSmsOptions {
    to: string; // Phone number with country code (e.g., +1234567890)
    message: string;
}

/**
 * Send SMS via Twilio
 */
const sendSms = async (
    clinicId: string,
    options: SendSmsOptions
): Promise<{ messageId: string; status: string }> => {
    try {
        // Get Twilio integration
        const integration = await prisma.integration.findFirst({
            where: {
                clinicId,
                type: "twilio",
                status: "connected",
            },
        });

        if (!integration || !integration.config) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Twilio integration not configured. Please connect via OAuth."
            );
        }

        const config = integration.config as any;
        const { accountSid, authToken, fromNumber } = config;

        if (!accountSid || !authToken || !fromNumber) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Twilio OAuth configuration incomplete. Please reconnect the integration."
            );
        }

        // Import Twilio SDK dynamically
        const twilio = require("twilio");
        const client = twilio(accountSid, authToken);

        // Send SMS
        const message = await client.messages.create({
            body: options.message,
            from: fromNumber,
            to: options.to,
        });

        logger.info(`SMS sent via Twilio: ${message.sid}`);

        return {
            messageId: message.sid,
            status: message.status,
        };
    } catch (error: any) {
        logger.error(`Failed to send SMS via Twilio: ${error.message}`);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            `Failed to send SMS: ${error.message}`
        );
    }
};

/**
 * Send appointment reminder SMS
 */
const sendAppointmentReminderSms = async (
    clinicId: string,
    phoneNumber: string,
    appointmentDetails: {
        clientName: string;
        sessionName: string;
        startTime: Date;
        clinicName: string;
    }
): Promise<void> => {
    const { clientName, sessionName, startTime, clinicName } = appointmentDetails;

    const message = `Hi ${clientName}, this is a reminder about your ${sessionName} appointment at ${clinicName} on ${startTime.toLocaleString()}. See you soon!`;

    await sendSms(clinicId, {
        to: phoneNumber,
        message,
    });
};

/**
 * Validate phone number format
 */
const validatePhoneNumber = (phoneNumber: string): boolean => {
    // Basic validation for international format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
};

export default {
    sendSms,
    sendAppointmentReminderSms,
    validatePhoneNumber,
};
