import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";

/**
 * Get client progress based on assessment history
 * Tracks scores over time, completion rates, and improvement trends
 * Provides comprehensive dashboard metrics for clinical outcome measurement
 */
export const getClientProgress = async (
    clientId: string,
    clinicId: string,
    options?: {
        templateId?: string;
        category?: string;
        startDate?: Date;
        endDate?: Date;
        frequency?: "daily" | "weekly" | "monthly" | "yearly";
    }
) => {
    // Verify client belongs to clinic
    const client = await prisma.client.findFirst({
        where: {
            id: clientId,
            clinicId,
        },
    });

    if (!client) {
        throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
    }

    // Set default date range if not provided (last 12 months)
    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
    const frequency = options?.frequency || "monthly";

    // Build filter
    const filter: any = {
        clientId,
        status: "completed",
        completedAt: {
            gte: startDate,
            lte: endDate,
        },
    };

    if (options?.templateId) {
        filter.templateId = options.templateId;
    }

    // Get completed assessments with template info
    const assessments = await prisma.assessmentInstance.findMany({
        where: filter,
        include: {
            template: {
                select: {
                    id: true,
                    title: true,
                    category: true,
                },
            },
        },
        orderBy: {
            completedAt: "asc",
        },
    });

    // Get appointment attendance for protocol adherence
    const appointments = await prisma.appointment.findMany({
        where: {
            clientId,
            clinicId,
            startTime: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            status: true,
        },
    });

    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(
        (a) => a.status === "completed"
    ).length;
    const attendanceRate = totalAppointments > 0
        ? Math.round((completedAppointments / totalAppointments) * 100)
        : 0;

    if (assessments.length === 0) {
        return {
            clientId,
            clientName: `${client.firstName} ${client.lastName}`,
            dateRange: {
                startDate,
                endDate,
            },
            totalAssessments: 0,
            longitudinalTrend: {
                percentageChange: 0,
                direction: "stable" as const,
            },
            clinicalStabilization: {
                averageSeverityScore: 0,
                currentSeverityLevel: "mild" as const,
            },
            protocolAdherence: {
                attendanceRate: attendanceRate,
                totalAppointments,
                completedAppointments,
            },
            frequency,
            trends: [],
            severityMap: [],
            assessments: [],
            progressByTemplate: [],
            progressByCategory: [],
            insights: "Insufficient data for analysis. No completed assessments found.",
        };
    }

    // Calculate overall statistics
    const totalAssessments = assessments.length;
    const scores = assessments.map((a) => (a.score! / a.maxScore!) * 100);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Calculate longitudinal trend (first assessment vs last assessment)
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const percentageChange = ((lastScore - firstScore) / firstScore) * 100;
    const direction = percentageChange > 5 ? "improving" : percentageChange < -5 ? "declining" : "stable";

    // Calculate severity score (inverse of percentage - lower score = better outcome)
    // Normalize to 0-20 scale where 20 is severe, 10 is moderate, 5 is mild
    const averageSeverityScore = Math.round(20 - (averageScore / 100) * 20);
    const currentSeverityScore = Math.round(20 - (lastScore / 100) * 20);

    const getSeverityLevel = (score: number): "mild" | "moderate" | "severe" => {
        if (score >= 15) return "severe";
        if (score >= 8) return "moderate";
        return "mild";
    };

    const currentSeverityLevel = getSeverityLevel(currentSeverityScore);

    // Helper function to generate time key based on frequency
    const getTimeKey = (date: Date, freq: string): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        switch (freq) {
            case "daily":
                return `${year}-${month}-${day}`;
            case "weekly":
                // Get week number
                const firstDayOfYear = new Date(year, 0, 1);
                const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
                const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                return `${year}-W${String(weekNum).padStart(2, "0")}`;
            case "yearly":
                return `${year}`;
            case "monthly":
            default:
                return `${year}-${month}`;
        }
    };

    // Helper function to format time label based on frequency
    const getTimeLabel = (timeKey: string, freq: string): string => {
        switch (freq) {
            case "daily":
                const [y, m, d] = timeKey.split("-");
                return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                });
            case "weekly":
                const [year, week] = timeKey.split("-W");
                return `Week ${week}, ${year}`;
            case "yearly":
                return timeKey;
            case "monthly":
            default:
                const [yr, mn] = timeKey.split("-");
                return new Date(parseInt(yr), parseInt(mn) - 1).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric"
                });
        }
    };

    // Group assessments by time period based on frequency
    const timeMap = new Map<string, { scores: number[]; count: number }>();
    assessments.forEach((assessment) => {
        const date = new Date(assessment.completedAt!);
        const timeKey = getTimeKey(date, frequency);

        if (!timeMap.has(timeKey)) {
            timeMap.set(timeKey, { scores: [], count: 0 });
        }

        const timeData = timeMap.get(timeKey)!;
        timeData.scores.push((assessment.score! / assessment.maxScore!) * 100);
        timeData.count++;
    });

    // Generate trends with severity scores
    const trends = Array.from(timeMap.entries())
        .map(([timeKey, data]) => {
            const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
            const severityScore = Math.round(20 - (avgScore / 100) * 20);

            return {
                period: timeKey,
                periodLabel: getTimeLabel(timeKey, frequency),
                averageScore: Math.round(avgScore * 100) / 100,
                severityScore,
                severityLevel: getSeverityLevel(severityScore),
                assessmentCount: data.count,
            };
        })
        .sort((a, b) => a.period.localeCompare(b.period));

    // Create severity map for chart
    const severityMap = trends.map((trend) => ({
        date: trend.periodLabel,
        severityScore: trend.severityScore,
        severityLevel: trend.severityLevel,
    }));

    // Group by template
    const templateMap = new Map<string, any[]>();
    assessments.forEach((assessment) => {
        const templateId = assessment.templateId;
        if (!templateMap.has(templateId)) {
            templateMap.set(templateId, []);
        }
        templateMap.get(templateId)!.push(assessment);
    });

    const progressByTemplate = Array.from(templateMap.entries()).map(([templateId, instances]) => {
        const templateScores = instances.map((i) => (i.score! / i.maxScore!) * 100);
        const templateAvg = templateScores.reduce((sum, s) => sum + s, 0) / templateScores.length;

        // Calculate trend for this template
        const firstTemplateScore = templateScores[0];
        const lastTemplateScore = templateScores[templateScores.length - 1];
        const templateChange = ((lastTemplateScore - firstTemplateScore) / firstTemplateScore) * 100;
        const templateTrend = templateChange > 5 ? "improving" : templateChange < -5 ? "declining" : "stable";

        return {
            templateId,
            templateTitle: instances[0].template.title,
            completedCount: instances.length,
            averageScore: Math.round(templateAvg * 100) / 100,
            latestScore: Math.round(templateScores[templateScores.length - 1] * 100) / 100,
            firstScore: Math.round(templateScores[0] * 100) / 100,
            trend: templateTrend,
            percentageChange: Math.round(templateChange * 100) / 100,
            scores: templateScores.map((score, index) => ({
                score: Math.round(score * 100) / 100,
                completedAt: instances[index].completedAt,
            })),
        };
    });

    // Group by category
    const categoryMap = new Map<string, any[]>();
    assessments.forEach((assessment) => {
        const category = assessment.template.category;
        if (!categoryMap.has(category)) {
            categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(assessment);
    });

    const progressByCategory = Array.from(categoryMap.entries()).map(([category, instances]) => {
        const categoryScores = instances.map((i) => (i.score! / i.maxScore!) * 100);
        const categoryAvg = categoryScores.reduce((sum, s) => sum + s, 0) / categoryScores.length;

        return {
            category,
            completedCount: instances.length,
            averageScore: Math.round(categoryAvg * 100) / 100,
            latestScore: Math.round(categoryScores[categoryScores.length - 1] * 100) / 100,
        };
    });

    // Format assessment timeline
    const assessmentTimeline = assessments.map((assessment) => ({
        id: assessment.id,
        templateTitle: assessment.template.title,
        category: assessment.template.category,
        score: assessment.score,
        maxScore: assessment.maxScore,
        percentage: Math.round((assessment.score! / assessment.maxScore!) * 100 * 100) / 100,
        severityScore: Math.round(20 - ((assessment.score! / assessment.maxScore!) * 100 / 100) * 20),
        completedAt: assessment.completedAt,
    }));

    // Generate clinical insights
    let insights = "";
    if (currentSeverityLevel === "mild") {
        insights = "Symptomatic stability observed. Patient aligns with mild domain markers. Continue current treatment protocol.";
    } else if (currentSeverityLevel === "moderate") {
        insights = "Symptomatic stability observed. Patient aligns with moderate domain markers. Monitor progress closely.";
    } else {
        insights = "Elevated severity markers detected. Consider treatment adjustment and increased monitoring frequency.";
    }

    if (direction === "improving") {
        insights += ` Positive longitudinal trend indicates treatment effectiveness (+${Math.abs(Math.round(percentageChange * 10) / 10)}%).`;
    } else if (direction === "declining") {
        insights += ` Declining trend observed (${Math.round(percentageChange * 10) / 10}%). Recommend clinical review.`;
    }

    return {
        clientId,
        clientName: `${client.firstName} ${client.lastName}`,
        dateRange: {
            startDate,
            endDate,
        },
        totalAssessments,

        // Longitudinal Trend (matches dashboard)
        longitudinalTrend: {
            percentageChange: Math.round(percentageChange * 10) / 10,
            direction,
        },

        // Clinical Stabilization (matches dashboard)
        clinicalStabilization: {
            averageSeverityScore,
            currentSeverityScore,
            currentSeverityLevel,
        },

        // Protocol Adherence (matches dashboard)
        protocolAdherence: {
            attendanceRate,
            totalAppointments,
            completedAppointments,
        },

        // Trends by frequency (daily/weekly/monthly/yearly)
        frequency,
        trends,

        // Severity Map for chart (matches dashboard)
        severityMap,

        // Detailed breakdowns
        assessments: assessmentTimeline,
        progressByTemplate,
        progressByCategory,

        // Clinical Insights
        insights,
    };
};
