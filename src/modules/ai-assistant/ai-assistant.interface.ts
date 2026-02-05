export interface ChatRequest {
    message: string;
    conversationHistory?: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
    context?: {
        clientId?: string;
        appointmentId?: string;
        sessionId?: string;
    };
}

export interface DraftEmailRequest {
    clientId: string;
    purpose: "followup" | "reminder" | "welcome" | "assessment" | "custom";
    customContext?: string;
    tone?: "professional" | "friendly" | "formal";
}

export interface SummarizeScheduleRequest {
    date?: string; // ISO date, defaults to today
    clinicMemberId?: string; // Optional, defaults to current user
}

export interface CreateInvoiceRequest {
    clientId: string;
    sessionIds?: string[];
    customItems?: Array<{
        description: string;
        amount: number;
    }>;
}

export interface SuggestionsRequest {
    context?: "dashboard" | "client" | "appointment" | "invoice";
    contextId?: string;
}
