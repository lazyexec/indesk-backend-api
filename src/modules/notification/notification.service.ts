import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import {
    INotification,
    ISendNotificationOptions,
    IBulkNotificationOptions,
    IPushNotificationPayload,
} from "./notification.interface";
import firebaseAdmin from "../../configs/firebase";
import logger from "../../utils/logger";

/**
 * Send push notification via Firebase Cloud Messaging
 */
const sendPushNotification = async (
    fcmToken: string,
    payload: IPushNotificationPayload
): Promise<void> => {
    if (!firebaseAdmin) {
        logger.warn("Firebase not initialized. Skipping push notification.");
        return;
    }

    try {
        const message = {
            token: fcmToken,
            notification: {
                title: payload.title,
                body: payload.body,
                ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
            },
            data: payload.data || {},
        };

        await firebaseAdmin.messaging().send(message);
        logger.info(`Push notification sent to token: ${fcmToken.substring(0, 10)}...`);
    } catch (error: any) {
        logger.error(`Failed to send push notification: ${error.message}`);
    }
};

/**
 * Create a notification in database
 */
const createNotification = async (
    notificationData: ISendNotificationOptions
): Promise<INotification> => {
    const { userId, title, message, type, data, sendPush = false } = notificationData;

    // Verify user exists
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fcmToken: true },
    });

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    // Create notification in database
    const notification = await prisma.$executeRaw`
    INSERT INTO "Notification" (id, "userId", title, message, type, data, "isRead", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${userId}, ${title}, ${message}, ${type}, ${JSON.stringify(data || {})}::jsonb, false, NOW(), NOW())
    RETURNING *
  `;

    // Send push notification if enabled and user has FCM token
    if (sendPush && user.fcmToken) {
        await sendPushNotification(user.fcmToken, {
            title,
            body: message,
            data: data || {},
        });
    }

    return notification as any;
};

/**
 * Send bulk notifications to multiple users
 */
const sendBulkNotifications = async (
    options: IBulkNotificationOptions
): Promise<void> => {
    const { userIds, title, message, type, data, sendPush = false } = options;

    // Get users with FCM tokens
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fcmToken: true },
    });

    if (users.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "No users found");
    }

    // Create notifications for all users
    const notifications = users.map((user) => ({
        userId: user.id,
        title,
        message,
        type,
        data: data || {},
        isRead: false,
    }));

    // Bulk insert notifications
    await prisma.$executeRawUnsafe(`
    INSERT INTO "Notification" (id, "userId", title, message, type, data, "isRead", "createdAt", "updatedAt")
    SELECT gen_random_uuid(), "userId", title, message, type, data::jsonb, "isRead", NOW(), NOW()
    FROM json_populate_recordset(null::"Notification", '${JSON.stringify(notifications)}')
  `);

    // Send push notifications if enabled
    if (sendPush && firebaseAdmin) {
        const tokens = users.filter((u) => u.fcmToken).map((u) => u.fcmToken!);

        if (tokens.length > 0) {
            try {
                await firebaseAdmin.messaging().sendEachForMulticast({
                    tokens,
                    notification: {
                        title,
                        body: message,
                    },
                    data: data || {},
                });
                logger.info(`Bulk push notifications sent to ${tokens.length} users`);
            } catch (error: any) {
                logger.error(`Failed to send bulk push notifications: ${error.message}`);
            }
        }
    }
};

/**
 * Get user notifications with pagination
 */
const getUserNotifications = async (
    userId: string,
    page: number = 1,
    limit: number = 20,
    isRead?: boolean
) => {
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };
    if (isRead !== undefined) {
        whereClause.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
        prisma.$queryRawUnsafe(`
      SELECT * FROM "Notification"
      WHERE "userId" = '${userId}'
      ${isRead !== undefined ? `AND "isRead" = ${isRead}` : ""}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `),
        prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "Notification"
      WHERE "userId" = '${userId}'
      ${isRead !== undefined ? `AND "isRead" = ${isRead}` : ""}
    `),
    ]);

    return {
        notifications,
        pagination: {
            page,
            limit,
            total: Number((total as any)[0]?.count || 0),
            totalPages: Math.ceil(Number((total as any)[0]?.count || 0) / limit),
        },
    };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId: string, userId: string): Promise<void> => {
    const notification = await prisma.$queryRawUnsafe(`
    SELECT * FROM "Notification" WHERE id = '${notificationId}' AND "userId" = '${userId}'
  `);

    if (!notification || (notification as any).length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
    }

    await prisma.$executeRaw`
    UPDATE "Notification"
    SET "isRead" = true, "readAt" = NOW(), "updatedAt" = NOW()
    WHERE id = ${notificationId}
  `;
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId: string): Promise<void> => {
    await prisma.$executeRaw`
    UPDATE "Notification"
    SET "isRead" = true, "readAt" = NOW(), "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "isRead" = false
  `;
};

/**
 * Delete a notification
 */
const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
    const notification = await prisma.$queryRawUnsafe(`
    SELECT * FROM "Notification" WHERE id = '${notificationId}' AND "userId" = '${userId}'
  `);

    if (!notification || (notification as any).length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
    }

    await prisma.$executeRaw`
    DELETE FROM "Notification" WHERE id = ${notificationId}
  `;
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (userId: string): Promise<number> => {
    const result = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "Notification"
    WHERE "userId" = '${userId}' AND "isRead" = false
  `);

    return Number((result as any)[0]?.count || 0);
};

/**
 * Get clinic notifications (for admins/owners)
 * Allows clinic owners and admins to view all notifications for their clinic members
 */
const getClinicNotifications = async (
    clinicId: string,
    requesterId: string,
    page: number = 1,
    limit: number = 20,
    isRead?: boolean,
    userId?: string
) => {
    // Verify requester is owner or admin of the clinic
    const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { ownerId: true },
    });

    if (!clinic) {
        throw new ApiError(httpStatus.NOT_FOUND, "Clinic not found");
    }

    const isOwner = clinic.ownerId === requesterId;

    // Check if requester is admin
    const membership = await prisma.clinicMember.findFirst({
        where: {
            clinicId,
            userId: requesterId,
            role: { in: ["admin", "superAdmin"] },
        },
    });

    if (!isOwner && !membership) {
        throw new ApiError(
            httpStatus.FORBIDDEN,
            "Only clinic owners and admins can view clinic notifications"
        );
    }

    // Get all clinic member user IDs
    const clinicMembers = await prisma.clinicMember.findMany({
        where: { clinicId },
        select: { userId: true },
    });

    const memberUserIds = clinicMembers.map((m) => m.userId);

    // Add clinic owner to the list
    if (!memberUserIds.includes(clinic.ownerId)) {
        memberUserIds.push(clinic.ownerId);
    }

    // If specific userId is provided, filter by that user
    const targetUserIds = userId ? [userId] : memberUserIds;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
        prisma.$queryRawUnsafe(`
      SELECT n.*, u."firstName", u."lastName", u.email
      FROM "Notification" n
      JOIN "User" u ON n."userId" = u.id
      WHERE n."userId" = ANY(ARRAY[${targetUserIds.map((id) => `'${id}'`).join(",")}]::uuid[])
      ${isRead !== undefined ? `AND n."isRead" = ${isRead}` : ""}
      ORDER BY n."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `),
        prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "Notification"
      WHERE "userId" = ANY(ARRAY[${targetUserIds.map((id) => `'${id}'`).join(",")}]::uuid[])
      ${isRead !== undefined ? `AND "isRead" = ${isRead}` : ""}
    `),
    ]);

    return {
        notifications,
        pagination: {
            page,
            limit,
            total: Number((total as any)[0]?.count || 0),
            totalPages: Math.ceil(Number((total as any)[0]?.count || 0) / limit),
        },
    };
};

export default {
    createNotification,
    sendBulkNotifications,
    getUserNotifications,
    getClinicNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    sendPushNotification,
};
