export interface INotification {
    id?: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    data?: Record<string, any>;
    isRead?: boolean;
    readAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export enum NotificationType {
    APPOINTMENT = "appointment",
    ASSESSMENT = "assessment",
    INVOICE = "invoice",
    SYSTEM = "system",
    REMINDER = "reminder",
    MESSAGE = "message",
}

export interface IPushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, any>;
    imageUrl?: string;
}

export interface ISendNotificationOptions {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    data?: Record<string, any>;
    sendPush?: boolean;
}

export interface IBulkNotificationOptions {
    userIds: string[];
    title: string;
    message: string;
    type: NotificationType;
    data?: Record<string, any>;
    sendPush?: boolean;
}
