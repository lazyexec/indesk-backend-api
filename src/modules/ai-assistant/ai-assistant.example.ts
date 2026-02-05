/**
 * AI Assistant Usage Examples
 * 
 * This file demonstrates how to use the AI Assistant API endpoints
 */

// Example 1: Chat with AI Assistant
const chatExample = {
    endpoint: "POST /api/v1/ai-assistant/chat",
    headers: {
        "Authorization": "Bearer <your-token>",
        "Content-Type": "application/json"
    },
    body: {
        message: "How can I improve client retention in my practice?",
        conversationHistory: [], // Optional: previous conversation
        context: {
            clientId: "optional-client-id" // Optional: for client-specific context
        }
    },
    response: {
        status: 200,
        data: {
            message: "Here are some strategies to improve client retention...",
            conversationHistory: [
                { role: "user", content: "How can I improve client retention..." },
                { role: "assistant", content: "Here are some strategies..." }
            ]
        }
    }
};

// Example 2: Draft Follow-up Email
const draftEmailExample = {
    endpoint: "POST /api/v1/ai-assistant/draft-email",
    headers: {
        "Authorization": "Bearer <your-token>",
        "Content-Type": "application/json"
    },
    body: {
        clientId: "client-123",
        purpose: "followup", // followup | reminder | welcome | assessment | custom
        tone: "friendly", // professional | friendly | formal
        customContext: "Client mentioned feeling anxious about upcoming presentation"
    },
    response: {
        status: 200,
        data: {
            subject: "Following Up on Our Session",
            body: "Dear John,\n\nI hope this email finds you well...",
            clientName: "John Doe",
            clientEmail: "john@example.com"
        }
    }
};

// Example 3: Summarize Today's Schedule
const summarizeScheduleExample = {
    endpoint: "POST /api/v1/ai-assistant/summarize-schedule",
    headers: {
        "Authorization": "Bearer <your-token>",
        "Content-Type": "application/json"
    },
    body: {
        date: "2026-02-06", // Optional: defaults to today
        clinicMemberId: "optional-member-id" // Optional: defaults to current user
    },
    response: {
        status: 200,
        data: {
            summary: "You have a busy day with 5 appointments. Your first session starts at 9:00 AM...",
            appointments: [
                {
                    time: "2026-02-06T09:00:00Z",
                    clientName: "Jane Smith",
                    sessionType: "Individual Therapy",
                    duration: 60,
                    status: "scheduled"
                }
            ],
            totalAppointments: 5
        }
    }
};

// Example 4: Create Invoice with AI
const createInvoiceExample = {
    endpoint: "POST /api/v1/ai-assistant/create-invoice",
    headers: {
        "Authorization": "Bearer <your-token>",
        "Content-Type": "application/json"
    },
    body: {
        clientId: "client-123",
        sessionIds: ["session-1", "session-2"], // Optional: appointments to include
        customItems: [ // Optional: additional items
            {
                description: "Assessment Report",
                amount: 50
            }
        ]
    },
    response: {
        status: 200,
        data: {
            clientId: "client-123",
            clientName: "John Doe",
            items: [
                { description: "Individual Therapy - 02/01/2026", amount: 150 },
                { description: "Individual Therapy - 02/05/2026", amount: 150 },
                { description: "Assessment Report", amount: 50 }
            ],
            totalAmount: 350,
            suggestedDescription: "Professional services rendered for the period...",
            dueDate: "2026-03-08T00:00:00Z"
        }
    }
};

// Example 5: Get Smart Suggestions
const getSuggestionsExample = {
    endpoint: "GET /api/v1/ai-assistant/suggestions?context=dashboard",
    headers: {
        "Authorization": "Bearer <your-token>"
    },
    queryParams: {
        context: "dashboard", // dashboard | client | appointment | invoice
        contextId: "optional-id" // Optional: specific context ID
    },
    response: {
        status: 200,
        data: {
            suggestions: [
                "Summarize today's schedule",
                "Follow up on 3 overdue invoices",
                "Draft follow-up email",
                "Create invoice"
            ]
        }
    }
};

// Example 6: Continuous Conversation
const conversationExample = {
    description: "Maintaining context across multiple messages",
    step1: {
        endpoint: "POST /api/v1/ai-assistant/chat",
        body: {
            message: "What are the best practices for initial client assessments?",
            conversationHistory: []
        }
    },
    step2: {
        endpoint: "POST /api/v1/ai-assistant/chat",
        body: {
            message: "Can you give me a template for that?",
            conversationHistory: [
                { role: "user", content: "What are the best practices..." },
                { role: "assistant", content: "Here are some best practices..." }
            ]
        }
    }
};

export {
    chatExample,
    draftEmailExample,
    summarizeScheduleExample,
    createInvoiceExample,
    getSuggestionsExample,
    conversationExample
};
