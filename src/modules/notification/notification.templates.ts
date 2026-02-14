import { NotificationType } from "./notification.interface";

/**
 * Notification templates for different types
 */
export const notificationTemplates = {
    appointment: {
        created: (clientName: string, date: string) => ({
            title: "New Appointment Scheduled",
            message: `Your appointment with ${clientName} has been scheduled for ${date}`,
        }),
        updated: (clientName: string, date: string) => ({
            title: "Appointment Updated",
            message: `Your appointment with ${clientName} has been rescheduled to ${date}`,
        }),
        cancelled: (clientName: string) => ({
            title: "Appointment Cancelled",
            message: `Your appointment with ${clientName} has been cancelled`,
        }),
        reminder: (clientName: string, time: string) => ({
            title: "Appointment Reminder",
            message: `Reminder: You have an appointment with ${clientName} in ${time}`,
        }),
    },
    assessment: {
        assigned: (assessmentTitle: string) => ({
            title: "New Assessment Assigned",
            message: `You have been assigned a new assessment: ${assessmentTitle}`,
        }),
        completed: (clientName: string, assessmentTitle: string) => ({
            title: "Assessment Completed",
            message: `${clientName} has completed the assessment: ${assessmentTitle}`,
        }),
        reminder: (assessmentTitle: string) => ({
            title: "Assessment Reminder",
            message: `Reminder: Please complete the assessment: ${assessmentTitle}`,
        }),
    },
    invoice: {
        created: (amount: number) => ({
            title: "New Invoice",
            message: `You have received a new invoice for $${amount.toFixed(2)}`,
        }),
        paid: (amount: number) => ({
            title: "Invoice Paid",
            message: `Your invoice of $${amount.toFixed(2)} has been paid`,
        }),
        overdue: (amount: number) => ({
            title: "Invoice Overdue",
            message: `Your invoice of $${amount.toFixed(2)} is now overdue`,
        }),
    },
    system: {
        welcome: (userName: string) => ({
            title: "Welcome to InDesk",
            message: `Welcome ${userName}! We're excited to have you on board.`,
        }),
        accountVerified: () => ({
            title: "Account Verified",
            message: "Your account has been successfully verified",
        }),
        passwordChanged: () => ({
            title: "Password Changed",
            message: "Your password has been successfully changed",
        }),
    },
    reminder: {
        generic: (message: string) => ({
            title: "Reminder",
            message,
        }),
    },
    message: {
        newMessage: (senderName: string) => ({
            title: "New Message",
            message: `You have a new message from ${senderName}`,
        }),
    },
};

/**
 * Helper function to get notification template
 */
export const getNotificationTemplate = (
    type: NotificationType,
    subType: string,
    ...args: any[]
): { title: string; message: string } => {
    const template = (notificationTemplates as any)[type]?.[subType];
    if (template && typeof template === "function") {
        return template(...args);
    }
    return {
        title: "Notification",
        message: "You have a new notification",
    };
};
