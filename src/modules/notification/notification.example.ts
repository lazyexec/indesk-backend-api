/**
 * Example usage of notification service in other modules
 * This file demonstrates how to integrate notifications into your application
 */

import notificationService from "./notification.service";
import { getNotificationTemplate } from "./notification.templates";

/**
 * Example 1: Send appointment notification
 */
export const sendAppointmentNotification = async (
    userId: string,
    clientName: string,
    appointmentDate: string,
    appointmentId: string
) => {
    const template = getNotificationTemplate(
        "appointment" as any,
        "created",
        clientName,
        appointmentDate
    );

    await notificationService.createNotification({
        userId,
        title: template.title,
        message: template.message,
        type: "appointment" as any,
        data: {
            appointmentId,
            clientName,
            date: appointmentDate,
        },
        sendPush: true, // Enable push notification
    });
};

/**
 * Example 2: Send assessment completion notification
 */
export const sendAssessmentCompletedNotification = async (
    clinicianId: string,
    clientName: string,
    assessmentTitle: string,
    assessmentId: string
) => {
    const template = getNotificationTemplate(
        "assessment" as any,
        "completed",
        clientName,
        assessmentTitle
    );

    await notificationService.createNotification({
        userId: clinicianId,
        title: template.title,
        message: template.message,
        type: "assessment" as any,
        data: {
            assessmentId,
            clientName,
            assessmentTitle,
        },
        sendPush: true,
    });
};

/**
 * Example 3: Send invoice notification
 */
export const sendInvoiceNotification = async (
    userId: string,
    amount: number,
    invoiceId: string,
    status: "created" | "paid" | "overdue"
) => {
    const template = getNotificationTemplate("invoice" as any, status, amount);

    await notificationService.createNotification({
        userId,
        title: template.title,
        message: template.message,
        type: "invoice" as any,
        data: {
            invoiceId,
            amount,
            status,
        },
        sendPush: true,
    });
};

/**
 * Example 4: Send bulk notification to clinic members
 */
export const sendClinicAnnouncementNotification = async (
    clinicMemberIds: string[],
    announcementTitle: string,
    announcementMessage: string
) => {
    await notificationService.sendBulkNotifications({
        userIds: clinicMemberIds,
        title: announcementTitle,
        message: announcementMessage,
        type: "system" as any,
        data: {
            type: "announcement",
            timestamp: new Date().toISOString(),
        },
        sendPush: true,
    });
};

/**
 * Example 5: Send appointment reminder (scheduled task)
 */
export const sendAppointmentReminder = async (
    userId: string,
    clientName: string,
    appointmentId: string,
    minutesUntil: number
) => {
    const timeText =
        minutesUntil < 60
            ? `${minutesUntil} minutes`
            : `${Math.floor(minutesUntil / 60)} hour${Math.floor(minutesUntil / 60) > 1 ? "s" : ""}`;

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
            appointmentId,
            clientName,
            minutesUntil,
        },
        sendPush: true,
    });
};

/**
 * Example 6: Welcome notification for new users
 */
export const sendWelcomeNotification = async (
    userId: string,
    userName: string
) => {
    const template = getNotificationTemplate("system" as any, "welcome", userName);

    await notificationService.createNotification({
        userId,
        title: template.title,
        message: template.message,
        type: "system" as any,
        data: {
            type: "welcome",
        },
        sendPush: false, // Don't send push for welcome message
    });
};

/**
 * Example 7: Integration with appointment module
 * Add this to your appointment.service.ts after creating an appointment
 */
export const appointmentCreatedHook = async (appointment: any) => {
    // Notify the clinician
    await sendAppointmentNotification(
        appointment.clinicianId,
        appointment.client.firstName + " " + appointment.client.lastName,
        new Date(appointment.startTime).toLocaleString(),
        appointment.id
    );

    // Optionally notify the client if they have a user account
    if (appointment.client.userId) {
        await notificationService.createNotification({
            userId: appointment.client.userId,
            title: "Appointment Confirmed",
            message: `Your appointment has been scheduled for ${new Date(appointment.startTime).toLocaleString()}`,
            type: "appointment" as any,
            data: {
                appointmentId: appointment.id,
            },
            sendPush: true,
        });
    }
};

/**
 * Example 8: Integration with assessment module
 * Add this to your assessment.service.ts after client completes assessment
 */
export const assessmentCompletedHook = async (assessmentInstance: any) => {
    if (assessmentInstance.clinicianId) {
        await sendAssessmentCompletedNotification(
            assessmentInstance.clinicianId,
            assessmentInstance.client.firstName +
            " " +
            assessmentInstance.client.lastName,
            assessmentInstance.template.title,
            assessmentInstance.id
        );
    }
};

/**
 * Example 9: Clinic admin viewing all notifications
 * Clinic owners and admins can view all notifications for their clinic members
 */
export const getClinicNotificationsExample = async (
    clinicId: string,
    adminUserId: string
) => {
    // Get all notifications for clinic members
    const allNotifications = await notificationService.getClinicNotifications(
        clinicId,
        adminUserId,
        1, // page
        50, // limit
        undefined, // isRead (undefined = all)
        undefined // userId (undefined = all members)
    );

    // Get only unread notifications
    const unreadNotifications = await notificationService.getClinicNotifications(
        clinicId,
        adminUserId,
        1,
        50,
        false, // only unread
        undefined
    );

    // Get notifications for a specific user
    const userNotifications = await notificationService.getClinicNotifications(
        clinicId,
        adminUserId,
        1,
        50,
        undefined,
        "specific-user-id" // filter by specific user
    );

    return {
        allNotifications,
        unreadNotifications,
        userNotifications,
    };
};
