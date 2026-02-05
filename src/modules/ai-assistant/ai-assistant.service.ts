import prisma from "../../configs/prisma";
import aiClient from "../../configs/ai";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import {
    ChatRequest,
    DraftEmailRequest,
    SummarizeScheduleRequest,
    CreateInvoiceRequest,
    SuggestionsRequest,
} from "./ai-assistant.interface";

const chat = async (userId: string, clinicId: string, chatRequest: ChatRequest) => {
    const { message, conversationHistory = [], context } = chatRequest;

    // Build context from database if provided
    let contextData = "";

    if (context?.clientId) {
        const client = await prisma.client.findUnique({
            where: { id: context.clientId, clinicId },
            include: {
                notes: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
                appointments: {
                    orderBy: { startTime: "desc" },
                    take: 5,
                },
            },
        });

        if (client) {
            contextData += `\nClient: ${client.firstName} ${client.lastName}`;
            if (client.notes.length > 0) {
                contextData += `\nRecent notes: ${client.notes.map(n => n.note).join("; ")}`;
            }
        }
    }

    if (context?.appointmentId) {
        const appointment = await prisma.appointment.findUnique({
            where: { id: context.appointmentId, clinicId },
            include: {
                client: true,
                session: true,
            },
        });

        if (appointment) {
            contextData += `\nAppointment: ${appointment.session.name} with ${appointment.client.firstName} ${appointment.client.lastName} on ${appointment.startTime}`;
        }
    }

    // Build conversation for AI
    const messages = [
        {
            role: "system" as const,
            content: `You are Inkind Assistant, an intelligent AI helper for clinic management. You help clinicians with tasks like summarizing notes, drafting emails, and optimizing schedules. Be professional, concise, and helpful.${contextData ? `\n\nContext: ${contextData}` : ""}`,
        },
        ...conversationHistory.map(msg => ({
            role: msg.role === "user" ? "user" as const : "assistant" as const,
            content: msg.content,
        })),
        {
            role: "user" as const,
            content: message,
        },
    ];

    const response = await aiClient.generateText({
        model: "gemini-2.5-flash",
        messages,
    });

    return {
        message: response.text,
        conversationHistory: [
            ...conversationHistory,
            { role: "user" as const, content: message },
            { role: "assistant" as const, content: response.text },
        ],
    };
};

const draftEmail = async (userId: string, clinicId: string, emailRequest: DraftEmailRequest) => {
    const { clientId, purpose, customContext, tone = "professional" } = emailRequest;

    // Get client details
    const client = await prisma.client.findUnique({
        where: { id: clientId, clinicId },
        include: {
            appointments: {
                orderBy: { startTime: "desc" },
                take: 1,
            },
            notes: {
                orderBy: { createdAt: "desc" },
                take: 1,
            },
            assignedClinician: {
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            },
        },
    });

    if (!client) {
        throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
    }

    // Get clinic details
    const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
            name: true,
            email: true,
            phoneNumber: true,
        },
    });

    // Build context for email
    let emailContext = `Client: ${client.firstName} ${client.lastName}\nEmail: ${client.email}`;

    if (client.assignedClinician) {
        emailContext += `\nClinician: ${client.assignedClinician.user.firstName} ${client.assignedClinician.user.lastName}`;
    }

    if (client.appointments.length > 0) {
        const lastAppt = client.appointments[0];
        emailContext += `\nLast appointment: ${lastAppt.startTime}`;
    }

    if (customContext) {
        emailContext += `\nAdditional context: ${customContext}`;
    }

    const purposePrompts: Record<string, string> = {
        followup: "Draft a follow-up email after a therapy session, checking in on the client's progress and scheduling next steps.",
        reminder: "Draft a friendly reminder email for an upcoming appointment.",
        welcome: "Draft a warm welcome email for a new client, introducing the clinic and what to expect.",
        assessment: "Draft an email requesting the client to complete an assessment form before their next session.",
        custom: customContext || "Draft a professional email to the client.",
    };

    const prompt = `${purposePrompts[purpose]}\n\nContext:\n${emailContext}\n\nTone: ${tone}\n\nProvide a complete email with subject line and body. Make it warm, professional, and personalized.`;

    const response = await aiClient.generateText({
        model: "gemini-2.5-flash",
        messages: [
            {
                role: "system",
                content: "You are an expert at writing professional, empathetic emails for healthcare clinics. Write clear, concise, and warm emails.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    return {
        subject: extractSubject(response.text),
        body: extractBody(response.text),
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email,
    };
};

const summarizeSchedule = async (userId: string, clinicId: string, request: SummarizeScheduleRequest) => {
    const { date, clinicMemberId } = request;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get user's clinic member ID if not provided
    let targetClinicMemberId = clinicMemberId;
    if (!targetClinicMemberId) {
        const clinicMember = await prisma.clinicMember.findFirst({
            where: { userId, clinicId },
        });

        if (!clinicMember) {
            throw new ApiError(httpStatus.FORBIDDEN, "You don't have access to this clinic");
        }

        targetClinicMemberId = clinicMember.id;
    }

    // Get appointments for the day
    const appointments = await prisma.appointment.findMany({
        where: {
            clinicId,
            clinicianId: targetClinicMemberId,
            startTime: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
        include: {
            client: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
            session: {
                select: {
                    name: true,
                    duration: true,
                },
            },
        },
        orderBy: {
            startTime: "asc",
        },
    });

    if (appointments.length === 0) {
        return {
            summary: "You have no appointments scheduled for this day.",
            appointments: [],
            totalAppointments: 0,
        };
    }

    // Build schedule context
    const scheduleContext = appointments.map((apt, idx) => {
        const time = apt.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        return `${idx + 1}. ${time} - ${apt.session.name} with ${apt.client.firstName} ${apt.client.lastName} (${apt.session.duration} min)`;
    }).join("\n");

    const prompt = `Summarize this day's schedule in a helpful, concise way. Highlight any back-to-back sessions, breaks, and provide time management tips if needed.\n\nSchedule:\n${scheduleContext}`;

    const response = await aiClient.generateText({
        model: "gemini-2.5-flash",
        messages: [
            {
                role: "system",
                content: "You are a helpful scheduling assistant. Provide clear, actionable summaries of daily schedules.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    return {
        summary: response.text,
        appointments: appointments.map(apt => ({
            time: apt.startTime,
            clientName: `${apt.client.firstName} ${apt.client.lastName}`,
            sessionType: apt.session.name,
            duration: apt.session.duration,
            status: apt.status,
        })),
        totalAppointments: appointments.length,
    };
};

const createInvoice = async (userId: string, clinicId: string, invoiceRequest: CreateInvoiceRequest) => {
    const { clientId, sessionIds = [], customItems = [] } = invoiceRequest;

    // Get client
    const client = await prisma.client.findUnique({
        where: { id: clientId, clinicId },
    });

    if (!client) {
        throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
    }

    // Get sessions if provided
    let items: Array<{ description: string; amount: number }> = [...customItems];

    if (sessionIds.length > 0) {
        const appointments = await prisma.appointment.findMany({
            where: {
                id: { in: sessionIds },
                clientId,
                clinicId,
            },
            include: {
                session: true,
            },
        });

        items = [
            ...items,
            ...appointments.map(apt => ({
                description: `${apt.session.name} - ${apt.startTime.toLocaleDateString()}`,
                amount: apt.session.price,
            })),
        ];
    }

    if (items.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No items provided for invoice");
    }

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // Generate invoice description using AI
    const itemsList = items.map((item, idx) => `${idx + 1}. ${item.description}: $${item.amount}`).join("\n");

    const prompt = `Generate a professional invoice description and notes for the following items:\n\n${itemsList}\n\nTotal: $${totalAmount}\n\nClient: ${client.firstName} ${client.lastName}\n\nProvide a brief, professional description suitable for an invoice.`;

    const response = await aiClient.generateText({
        model: "gemini-2.5-flash",
        messages: [
            {
                role: "system",
                content: "You are a professional billing assistant. Generate clear, concise invoice descriptions.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    return {
        clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        items,
        totalAmount,
        suggestedDescription: response.text,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };
};

const getSuggestions = async (userId: string, clinicId: string, request: SuggestionsRequest) => {
    const { context = "dashboard", contextId } = request;

    let suggestions: string[] = [];

    switch (context) {
        case "dashboard":
            // Get quick stats for suggestions
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const [todayAppointments, overdueInvoices] = await Promise.all([
                prisma.appointment.count({
                    where: {
                        clinicId,
                        startTime: { gte: todayStart, lte: todayEnd },
                    },
                }),
                prisma.invoice.count({
                    where: {
                        clinicId,
                        status: "pending",
                        dueDate: { lt: new Date() },
                    },
                }),
            ]);

            if (todayAppointments > 0) {
                suggestions.push("Summarize today's schedule");
            }
            if (overdueInvoices > 0) {
                suggestions.push(`Follow up on ${overdueInvoices} overdue invoices`);
            }
            suggestions.push("Draft follow-up email");
            suggestions.push("Create invoice");
            break;

        case "client":
            if (contextId) {
                suggestions.push("Draft follow-up email");
                suggestions.push("Summarize client history");
                suggestions.push("Create invoice");
            }
            break;

        case "appointment":
            suggestions.push("Create clinical note");
            suggestions.push("Schedule follow-up");
            suggestions.push("Send reminder email");
            break;

        case "invoice":
            suggestions.push("Draft payment reminder");
            suggestions.push("Generate receipt");
            break;
    }

    return { suggestions };
};

// Helper functions
const extractSubject = (emailText: string): string => {
    const subjectMatch = emailText.match(/Subject:\s*(.+)/i);
    return subjectMatch ? subjectMatch[1].trim() : "Follow-up";
};

const extractBody = (emailText: string): string => {
    const bodyMatch = emailText.split(/Subject:.+/i)[1];
    return bodyMatch ? bodyMatch.trim() : emailText;
};

export default {
    chat,
    draftEmail,
    summarizeSchedule,
    createInvoice,
    getSuggestions,
};
