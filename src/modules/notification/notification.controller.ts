import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import response from "../../utils/response";
import notificationService from "./notification.service";
import ApiError from "../../utils/ApiError";

/**
 * Get clinic notifications (for admins/owners)
 */
const getClinicNotifications = catchAsync(async (req: Request, res: Response) => {
    const user: any = req.user;
    const { clinicId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isRead = req.query.isRead === "true" ? true : req.query.isRead === "false" ? false : undefined;
    const userId = req.query.userId as string | undefined;

    const result = await notificationService.getClinicNotifications(
        clinicId,
        user.id,
        page,
        limit,
        isRead,
        userId
    );

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Clinic notifications retrieved successfully",
            data: result.notifications,
            pagination: result.pagination,
        })
    );
});

/**
 * Get user notifications
 */
const getNotifications = catchAsync(async (req: Request, res: Response) => {
    const user: any = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isRead = req.query.isRead === "true" ? true : req.query.isRead === "false" ? false : undefined;

    const result = await notificationService.getUserNotifications(user.id, page, limit, isRead);

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Notifications retrieved successfully",
            data: result.notifications,
            pagination: result.pagination,
        })
    );
});

/**
 * Get unread notification count
 */
const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
    const user: any = req.user;
    const count = await notificationService.getUnreadCount(user.id);

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Unread count retrieved successfully",
            data: { count },
        })
    );
});

/**
 * Mark notification as read
 */
const markAsRead = catchAsync(async (req: Request, res: Response) => {
    const user: any = req.user;
    const { notificationId } = req.params;

    await notificationService.markAsRead(notificationId, user.id);

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Notification marked as read",
        })
    );
});

/**
 * Mark all notifications as read
 */
const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
    const user: any = req.user;
    await notificationService.markAllAsRead(user.id);

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "All notifications marked as read",
        })
    );
});

/**
 * Delete notification
 */
const deleteNotification = catchAsync(async (req: Request, res: Response) => {
    const user: any = req.user;
    const { notificationId } = req.params;

    await notificationService.deleteNotification(notificationId, user.id);

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Notification deleted successfully",
        })
    );
});

/**
 * Send test notification (for testing purposes)
 */
const sendTestNotification = catchAsync(async (req: Request, res: Response) => {
    const user: any = req.user;
    const { title, message, sendPush } = req.body;

    await notificationService.createNotification({
        userId: user.id,
        title: title || "Test Notification",
        message: message || "This is a test notification",
        type: "system" as any,
        sendPush: sendPush || false,
    });

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Test notification sent successfully",
        })
    );
});

export default {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendTestNotification,
    getClinicNotifications,
};
