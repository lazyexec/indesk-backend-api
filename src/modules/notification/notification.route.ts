import express, { Router } from "express";
import notificationController from "./notification.controller";
import validate from "../../middlewares/validate";
import notificationValidation from "./notification.validation";
import auth from "../../middlewares/auth";

const router: Router = express.Router();

// Get clinic notifications (for admins/owners)
router.get(
    "/clinic/:clinicId",
    auth("common"),
    validate(notificationValidation.getClinicNotifications),
    notificationController.getClinicNotifications
);

// Get user notifications
router.get(
    "/",
    auth("common"),
    validate(notificationValidation.getNotifications),
    notificationController.getNotifications
);

// Get unread count
router.get(
    "/unread-count",
    auth("common"),
    notificationController.getUnreadCount
);

// Mark notification as read
router.patch(
    "/:notificationId/read",
    auth("common"),
    validate(notificationValidation.markAsRead),
    notificationController.markAsRead
);

// Mark all as read
router.patch(
    "/read-all",
    auth("common"),
    notificationController.markAllAsRead
);

// Delete notification
router.delete(
    "/:notificationId",
    auth("common"),
    validate(notificationValidation.deleteNotification),
    notificationController.deleteNotification
);

// Send test notification
router.post(
    "/test",
    auth("common"),
    validate(notificationValidation.sendTestNotification),
    notificationController.sendTestNotification
);

export default router;
