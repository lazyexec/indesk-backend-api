import Joi from "joi";

const getNotifications = {
    query: Joi.object().keys({
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
        isRead: Joi.boolean().optional(),
    }),
};

const getClinicNotifications = {
    params: Joi.object().keys({
        clinicId: Joi.string().uuid().required(),
    }),
    query: Joi.object().keys({
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
        isRead: Joi.boolean().optional(),
        userId: Joi.string().uuid().optional(),
    }),
};

const markAsRead = {
    params: Joi.object().keys({
        notificationId: Joi.string().uuid().required(),
    }),
};

const deleteNotification = {
    params: Joi.object().keys({
        notificationId: Joi.string().uuid().required(),
    }),
};

const sendTestNotification = {
    body: Joi.object().keys({
        title: Joi.string().optional(),
        message: Joi.string().optional(),
        sendPush: Joi.boolean().optional(),
    }),
};

export default {
    getNotifications,
    getClinicNotifications,
    markAsRead,
    deleteNotification,
    sendTestNotification,
};
