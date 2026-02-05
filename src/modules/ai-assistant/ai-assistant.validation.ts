import Joi from "joi";

const chat = {
    body: Joi.object({
        message: Joi.string().required().min(1).max(2000),
        conversationHistory: Joi.array().items(
            Joi.object({
                role: Joi.string().valid("user", "assistant").required(),
                content: Joi.string().required(),
            })
        ),
        context: Joi.object({
            clientId: Joi.string(),
            appointmentId: Joi.string(),
            sessionId: Joi.string(),
        }),
    }),
};

const draftEmail = {
    body: Joi.object({
        clientId: Joi.string().required(),
        purpose: Joi.string()
            .valid("followup", "reminder", "welcome", "assessment", "custom")
            .required(),
        customContext: Joi.string().max(500),
        tone: Joi.string().valid("professional", "friendly", "formal").default("professional"),
    }),
};

const summarizeSchedule = {
    body: Joi.object({
        date: Joi.string().isoDate(),
        clinicMemberId: Joi.string(),
    }),
};

const createInvoice = {
    body: Joi.object({
        clientId: Joi.string().required(),
        sessionIds: Joi.array().items(Joi.string()),
        customItems: Joi.array().items(
            Joi.object({
                description: Joi.string().required(),
                amount: Joi.number().positive().required(),
            })
        ),
    }),
};

const suggestions = {
    query: Joi.object({
        context: Joi.string().valid("dashboard", "client", "appointment", "invoice"),
        contextId: Joi.string(),
    }),
};

export default {
    chat,
    draftEmail,
    summarizeSchedule,
    createInvoice,
    suggestions,
};
