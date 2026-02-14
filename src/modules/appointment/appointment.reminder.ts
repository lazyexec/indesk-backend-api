/**
 * Appointment Reminder Service
 * Handles sending reminders via notifications, SMS, and email
 */

import prisma from "../../configs/prisma";
import logger from "../../utils/logger";
import notificationService from "../notification/notification.service";
import twilioIntegration from "../integration/services/twilio.integration";
import { isIntegrationConnected } from "../integration/integration.helper";
import { getNotificationTemplate } from "../notification/notification.templates";

/**
 * Send appointment reminders
 * This should be called by a cron job every 5-15 minutes
 */
export const sendAppointmentReminders = async (): Promise<void> => {
    try {
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        // Find appointments starting in the next 2 hours
        const upcomingAppointments = await prisma.appointment.findMany({
            where: {
                startTime: {
                    gte: now,
                    lte: twoHoursFromNow,
                },
                status: {
                    in: ["pending", "scheduled"],
                },
            },
            include: {
                client: true,
                clinician: {
                    include: {
                        user: true,
                    },
                },
                session: true,
                clinic: true,
            },
        });

        for (const appointment of upcomingAppointments) {
            const minutesUntil = Math.floor(
                (new Date(appointment.startTime).getTime() - now.getTime()) / 60000
            );

            // Check if session has reminders configured
            const reminders = (appointment.session.reminders as number[]) || [];

            // Check if we should send reminder at this time
            const shouldSendReminder = reminders.some(
                (reminderMinutes) =>
                    Math.abs(minutesUntil - reminderMinutes) <= 5 // Within 5 minutes of reminder time
            );

            if (!shouldSendReminder) {
                continue;
            }

            // Check if reminder was already sent (using a simple check)
            // You might want to add a separate table to track sent reminders
            const recentNotification = await prisma.notification.findFirst({
                where: {
                    userId: appointment.clinician.userId,
                    type: "reminder",
                    createdAt: {
                        gte: new Date(now.getTime() - 10 * 60 * 1000), // Last 10 minutes
                    },
                    data: {
                        path: ["appointmentId"],
                        equals: appointment.id,
                    },
                },
            });

            if (recentNotification) {
                continue; // Already sent
            }

            const timeText =
                minutesUntil < 60
                    ? `${minutesUntil} minutes`
                    : `${Math.floor(minutesUntil / 60)} hour${Math.floor(minutesUntil / 60) > 1 ? "s" : ""}`;

            const clientName = `${appointment.client.firstName} ${appointment.client.lastName}`;

            // 1. Send in-app notification (always)
            await sendInAppReminder(
                appointment.clinician.userId,
                clientName,
                timeText,
                appointment
            );

            // 2. Send SMS reminder if enabled
            if (appointment.session.enableSmsReminders) {
                await sendSmsReminder(appointment, clientName, timeText);
            }

            // 3. Send email reminder if enabled
            if (appointment.session.enableEmailReminders) {
                await sendEmailReminder(appointment, clientName, timeText);
            }

            logger.info(
                `Reminders sent for appointment ${appointment.id} (${minutesUntil} minutes until start)`
            );
        }

        logger.info(
            `Processed ${upcomingAppointments.length} upcoming appointments for reminders`
        );
    } catch (error: any) {
        logger.error(`Error sending appointment reminders: ${error.message}`);
    }
};

/**
 * Send in-app notification reminder
 */
const sendInAppReminder = async (
    userId: string,
    clientName: string,
    timeText: string,
    appointment: any
): Promise<void> => {
    try {
        const template = getNotificationTemplate(
            "appointment" as any,
            "reminder",
            clientName,
            timeText
        );

        await notificationService.createNotification({
            userId,
            title: template.title,
            message: template.message,
            type: "reminder" as any,
            data: {
                appointmentId: appointment.id,
                clientName,
                startTime: appointment.startTime.toISOString(),
                sessionName: appointment.session.name,
                minutesUntil: Math.floor(
                    (new Date(appointment.startTime).getTime() - Date.now()) / 60000
                ),
            },
            sendPush: true,
        });
    } catch (error: any) {
        logger.error(`Failed to send in-app reminder: ${error.message}`);
    }
};

/**
 * Send SMS reminder via Twilio
 */
const sendSmsReminder = async (
    appointment: any,
    clientName: string,
    timeText: string
): Promise<void> => {
    try {
        const hasTwilio = await isIntegrationConnected(
            appointment.clinicId,
            "twilio"
        );

        if (!hasTwilio) {
            logger.warn(
                `Twilio not connected for clinic ${appointment.clinicId}, skipping SMS reminder`
            );
            return;
        }

        // Check if client has phone number
        if (!appointment.client.phoneNumber || !appointment.client.countryCode) {
            logger.warn(
                `Client ${appointment.client.id} has no phone number, skipping SMS reminder`
            );
            return;
        }

        const phoneNumber = `${appointment.client.countryCode}${appointment.client.phoneNumber}`;

        if (!twilioIntegration.validatePhoneNumber(phoneNumber)) {
            logger.warn(`Invalid phone number format: ${phoneNumber}`);
            return;
        }

        await twilioIntegration.sendAppointmentReminderSms(
            appointment.clinicId,
            phoneNumber,
            {
                clientName,
                sessionName: appointment.session.name,
                startTime: appointment.startTime,
                clinicName: appointment.clinic.name,
            }
        );

        logger.info(`SMS reminder sent to ${phoneNumber}`);
    } catch (error: any) {
        logger.error(`Failed to send SMS reminder: ${error.message}`);
    }
};

/**
 * Send email reminder via Mailchimp
 */
const sendEmailReminder = async (
    appointment: any,
    clientName: string,
    timeText: string
): Promise<void> => {
    try {
        const hasMailchimp = await isIntegrationConnected(
            appointment.clinicId,
            "mailchimp"
        );

        if (!hasMailchimp) {
            logger.warn(
                `Mailchimp not connected for clinic ${appointment.clinicId}, skipping email reminder`
            );
            return;
        }

        // Import Mailchimp service dynamically to avoid circular dependencies
        const mailchimpIntegration = (
            await import("../integration/services/mailchimp.integration")
        ).default;

        await mailchimpIntegration.sendAppointmentReminderEmail(
            appointment.clinicId,
            {
                to: appointment.client.email,
                clientName,
                sessionName: appointment.session.name,
                startTime: appointment.startTime,
                clinicName: appointment.clinic.name,
                meetingUrl:
                    appointment.zoomJoinUrl ||
                    appointment.googleMeetUrl ||
                    "In-person appointment",
            }
        );

        logger.info(`Email reminder sent to ${appointment.client.email}`);
    } catch (error: any) {
        logger.error(`Failed to send email reminder: ${error.message}`);
    }
};

/**
 * Initialize reminder scheduler
 * Call this in your main application startup
 * 
 * Example usage in index.ts:
 * 
 * import { initializeReminderScheduler } from './modules/appointment/appointment.reminder';
 * initializeReminderScheduler();
 */
export const initializeReminderScheduler = (): void => {
    // Uncomment when node-cron is installed
    // npm install node-cron
    // npm install --save-dev @types/node-cron

    /*
    const cron = require('node-cron');
    
    // Run every 15 minutes
    cron.schedule('*\/15 * * * *', () => {
      logger.info('Running appointment reminder scheduler');
      sendAppointmentReminders();
    });
  
    logger.info('Appointment reminder scheduler initialized');
    */

    logger.warn(
        "Appointment reminder scheduler not initialized. Install node-cron to enable scheduled reminders."
    );
};

export default {
    sendAppointmentReminders,
    initializeReminderScheduler,
};
