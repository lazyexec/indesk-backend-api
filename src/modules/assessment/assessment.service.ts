import {
  IAssessmentTemplate,
  IAssessmentQuestion,
  ICreateAssessmentInstance,
  ISubmitAssessment,
} from "./assessment.interface";
import prisma from "../../configs/prisma";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { randomBytes } from "crypto";
import env from "../../configs/env";
import emailService from "../../configs/email";
import fs from "../../utils/fs";
import notificationService from "../notification/notification.service";
import { getNotificationTemplate } from "../notification/notification.templates";
import { getClientProgress } from "./assessment.progress";
import { analyzeAssessmentResponses } from "./assessment.ai";

type StandardizedScaleKey = "phq9" | "phq2" | "gad7" | "gad2";

interface StandardizedScaleDefinition {
  key: StandardizedScaleKey;
  title: string;
  aliases: string[];
  expectedQuestionCount: number;
  optionScoreMap: Record<string, number>;
}

const STANDARDIZED_SCALE_DEFINITIONS: StandardizedScaleDefinition[] = [
  {
    key: "phq9",
    title: "PHQ-9",
    aliases: ["phq9", "phq-9", "patienthealthquestionnaire9"],
    expectedQuestionCount: 9,
    optionScoreMap: {
      notatall: 0,
      severaldays: 1,
      morethanhalfthedays: 2,
      nearlyeveryday: 3,
    },
  },
  {
    key: "phq2",
    title: "PHQ-2",
    aliases: ["phq2", "phq-2", "patienthealthquestionnaire2"],
    expectedQuestionCount: 2,
    optionScoreMap: {
      notatall: 0,
      severaldays: 1,
      morethanhalfthedays: 2,
      nearlyeveryday: 3,
    },
  },
  {
    key: "gad7",
    title: "GAD-7",
    aliases: ["gad7", "gad-7", "generalizedanxietydisorder7"],
    expectedQuestionCount: 7,
    optionScoreMap: {
      notatall: 0,
      severaldays: 1,
      morethanhalfthedays: 2,
      nearlyeveryday: 3,
    },
  },
  {
    key: "gad2",
    title: "GAD-2",
    aliases: ["gad2", "gad-2", "generalizedanxietydisorder2"],
    expectedQuestionCount: 2,
    optionScoreMap: {
      notatall: 0,
      severaldays: 1,
      morethanhalfthedays: 2,
      nearlyeveryday: 3,
    },
  },
];

const normalizeScaleText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const getStandardizedScaleDefinition = (
  templateTitle: string,
  questionCount: number
): StandardizedScaleDefinition | null => {
  const normalizedTitle = normalizeScaleText(templateTitle);

  const definition = STANDARDIZED_SCALE_DEFINITIONS.find((scale) =>
    scale.aliases.some((alias) => normalizedTitle.includes(alias))
  );

  if (!definition) {
    return null;
  }

  if (questionCount !== definition.expectedQuestionCount) {
    return null;
  }

  return definition;
};

const getStandardizedScaleSummary = (
  scale: StandardizedScaleDefinition,
  totalScore: number
): { severity: string; interpretation: string; recommendations: string[] } => {
  if (scale.key === "phq9") {
    if (totalScore <= 4) {
      return {
        severity: "Minimal",
        interpretation: "Minimal depression severity (PHQ-9: 0-4).",
        recommendations: ["Continue routine monitoring.", "Reassess if symptoms worsen."],
      };
    }
    if (totalScore <= 9) {
      return {
        severity: "Mild",
        interpretation: "Mild depression severity (PHQ-9: 5-9).",
        recommendations: ["Use watchful waiting and follow-up.", "Provide supportive interventions."],
      };
    }
    if (totalScore <= 14) {
      return {
        severity: "Moderate",
        interpretation: "Moderate depression severity (PHQ-9: 10-14).",
        recommendations: ["Consider active treatment plan.", "Schedule closer clinical follow-up."],
      };
    }
    if (totalScore <= 19) {
      return {
        severity: "Moderately Severe",
        interpretation: "Moderately severe depression (PHQ-9: 15-19).",
        recommendations: ["Initiate or adjust treatment promptly.", "Assess functional impairment and safety."],
      };
    }
    return {
      severity: "Severe",
      interpretation: "Severe depression (PHQ-9: 20-27).",
      recommendations: ["Urgent clinical intervention recommended.", "Perform immediate safety/risk assessment."],
    };
  }

  if (scale.key === "gad7") {
    if (totalScore <= 4) {
      return {
        severity: "Minimal",
        interpretation: "Minimal anxiety severity (GAD-7: 0-4).",
        recommendations: ["Continue routine monitoring.", "Reassess if symptoms increase."],
      };
    }
    if (totalScore <= 9) {
      return {
        severity: "Mild",
        interpretation: "Mild anxiety severity (GAD-7: 5-9).",
        recommendations: ["Provide psychoeducation and follow-up.", "Monitor progression over time."],
      };
    }
    if (totalScore <= 14) {
      return {
        severity: "Moderate",
        interpretation: "Moderate anxiety severity (GAD-7: 10-14).",
        recommendations: ["Consider treatment optimization.", "Increase monitoring frequency."],
      };
    }
    return {
      severity: "Severe",
      interpretation: "Severe anxiety (GAD-7: 15-21).",
      recommendations: ["Prompt clinical intervention recommended.", "Assess safety and functional impact."],
    };
  }

  return {
    severity: "Screen Positive",
    interpretation: `${scale.title} score indicates elevated symptoms.`,
    recommendations: ["Review findings in clinical context.", "Plan follow-up assessment."],
  };
};

const scoreStandardizedAssessment = (
  templateTitle: string,
  responses: Array<{ questionId: string; answer: string }>,
  questions: Array<{ id: string }>
) => {
  const scale = getStandardizedScaleDefinition(templateTitle, questions.length);
  if (!scale) {
    return null;
  }

  let totalScore = 0;
  const maxScore = scale.expectedQuestionCount * 3;
  const responsesToCreate: Array<{
    questionId: string;
    answer: string;
    points: number;
  }> = [];

  for (const response of responses) {
    const normalizedAnswer = normalizeScaleText(response.answer);
    const score = scale.optionScoreMap[normalizedAnswer];

    if (score === undefined) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid response for ${scale.title}. Allowed options: Not at all, Several days, More than half the days, Nearly every day`
      );
    }

    totalScore += score;
    responsesToCreate.push({
      questionId: response.questionId,
      answer: response.answer,
      points: score,
    });
  }

  const summary = getStandardizedScaleSummary(scale, totalScore);

  return {
    scale,
    totalScore,
    maxScore,
    responsesToCreate,
    summary,
  };
};

const validateResponseSet = (
  responses: Array<{ questionId: string; answer: string }>,
  questions: Array<{ id: string }>
) => {
  if (responses.length !== questions.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "All questions must be answered"
    );
  }

  const validQuestionIds = new Set(questions.map((q) => q.id));
  const seenQuestionIds = new Set<string>();

  for (const response of responses) {
    if (!validQuestionIds.has(response.questionId)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Question ${response.questionId} not found`
      );
    }

    if (seenQuestionIds.has(response.questionId)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Duplicate answer found for question ${response.questionId}`
      );
    }

    seenQuestionIds.add(response.questionId);
  }
};

const buildAiScoringResult = async (
  templateTitle: string,
  responses: Array<{ questionId: string; answer: string }>,
  questionMap: Map<string, { question: string; type: string; options: any }>,
  instanceNote?: string | null
) => {
  const questionsAndAnswers = responses.map((response) => {
    const question = questionMap.get(response.questionId);
    if (!question) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Question ${response.questionId} not found`
      );
    }

    return {
      question: question.question,
      type: question.type,
      answer: response.answer,
      options: question.options,
    };
  });

  const aiAnalysis = await analyzeAssessmentResponses(templateTitle, questionsAndAnswers);

  const responsesToCreate = responses.map((response, index) => ({
    questionId: response.questionId,
    answer: response.answer,
    points: aiAnalysis.responsesAnalysis[index]?.points || 0,
  }));

  const note = `${instanceNote || ""}\n\nAI Analysis:\nSeverity: ${aiAnalysis.severity}\nSummary: ${aiAnalysis.summary}\n\nRecommendations:\n${aiAnalysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`.trim();

  return {
    totalScore: aiAnalysis.totalScore,
    maxScore: aiAnalysis.maxScore,
    responsesToCreate,
    note,
  };
};

// Generate unique share token
const generateShareToken = (): string => {
  return randomBytes(32).toString("hex");
};

// Create Assessment Template (Admin only)
const createAssessmentTemplate = async (
  userId: string,
  clinicId: string,
  templateData: IAssessmentTemplate
) => {
  // Verify user has access to clinic and is admin
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId,
    },
  });

  if (!clinicMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You don't have access to this clinic"
    );
  }

  if (!["admin", "superAdmin"].includes(clinicMember.role)) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only admins can create assessment templates"
    );
  }

  const { title, description, category, questions } = templateData;

  // Create template with questions
  const template = await prisma.assessmentTemplate.create({
    data: {
      clinicId,
      createdBy: userId,
      title,
      description,
      category,
      questions: {
        create: questions.map((q, index) => ({
          question: q.question,
          type: q.type,
          options: q.options ? (q.options as any) : undefined,
          points: q.points || 1,
          order: q.order !== undefined ? q.order : index,
        })),
      },
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return template;
};

// Get Assessment Templates
const getAssessmentTemplates = async (
  userId: string,
  clinicId: string,
  options: any
) => {
  // Verify user has access to clinic
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId,
    },
  });

  if (!clinicMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You don't have access to this clinic"
    );
  }

  const { limit = 10, page = 1, sort = { createdAt: "desc" }, category } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    clinicId,
  };

  if (category) {
    where.category = category;
  }

  const [templates, totalDocs] = await Promise.all([
    prisma.assessmentTemplate.findMany({
      where,
      take,
      skip,
      orderBy: sort,
      include: {
        questions: {
          orderBy: {
            order: "asc",
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            instances: true,
          },
        },
      },
    }),
    prisma.assessmentTemplate.count({
      where,
    }),
  ]);

  return {
    docs: templates,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

// Get Assessment Template by ID
const getAssessmentTemplateById = async (
  userId: string,
  templateId: string
) => {
  const template = await prisma.assessmentTemplate.findUnique({
    where: { id: templateId },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      clinic: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, "Assessment template not found");
  }

  // Verify user has access to clinic
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId: template.clinicId,
    },
  });

  if (!clinicMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You don't have access to this assessment template"
    );
  }

  return template;
};

// Update Assessment Template
const updateAssessmentTemplate = async (
  userId: string,
  templateId: string,
  updateData: Partial<IAssessmentTemplate>
) => {
  const template = await getAssessmentTemplateById(userId, templateId);

  // Check if user is admin
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId: template.clinicId,
    },
  });

  if (!["admin", "superAdmin"].includes(clinicMember?.role || "")) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only admins can update assessment templates"
    );
  }

  const { questions, clinicId, ...restData } = updateData;

  const updatedTemplate = await prisma.assessmentTemplate.update({
    where: { id: templateId },
    data: {
      ...restData,
      ...(questions && {
        questions: {
          deleteMany: {},
          create: questions.map((q, index) => ({
            question: q.question,
            type: q.type,
            options: q.options ? (q.options as any) : undefined,
            points: q.points || 1,
            order: q.order !== undefined ? q.order : index,
          })),
        },
      }),
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  return updatedTemplate;
};

// Delete Assessment Template
const deleteAssessmentTemplate = async (userId: string, templateId: string) => {
  const template = await getAssessmentTemplateById(userId, templateId);

  // Check if user is admin
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId: template.clinicId,
    },
  });

  if (!["admin", "superAdmin"].includes(clinicMember?.role || "")) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only admins can delete assessment templates"
    );
  }

  const linkedInstancesCount = await prisma.assessmentInstance.count({
    where: { templateId },
  });

  if (linkedInstancesCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete this template because assessments are already assigned/completed. Please archive it instead."
    );
  }

  try {
    await prisma.assessmentTemplate.delete({
      where: { id: templateId },
    });
  } catch (error: any) {
    if (error?.code === "P2003") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot delete this template because it is referenced by assessment records."
      );
    }
    throw error;
  }
};

// Create Assessment Instance (Assign to patient)
const createAssessmentInstance = async (
  userId: string,
  instanceData: ICreateAssessmentInstance & { files?: any }
) => {
  const { templateId, clientId, clinicianId, document, note, files } = instanceData;

  // Handle file upload - if file is uploaded, use its path, otherwise use document from body
  let documentPath: string | undefined = document;
  if (files && files.document && files.document[0]) {
    const file = files.document[0];
    documentPath = env.BACKEND_URL + "/public" + fs.sanitizePath(file.path);
  }

  // Verify template exists
  const template = await prisma.assessmentTemplate.findUnique({
    where: { id: templateId },
    include: {
      clinic: true,
    },
  });

  if (!template) {
    throw new ApiError(httpStatus.NOT_FOUND, "Assessment template not found");
  }

  // Verify client exists and belongs to same clinic
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      clinic: true,
    },
  });

  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, "Client not found");
  }

  if (client.clinicId !== template.clinicId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Client and template must belong to the same clinic"
    );
  }

  // Verify user has access to clinic
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId: template.clinicId,
    },
  });

  if (!clinicMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You don't have access to this clinic"
    );
  }

  // Verify clinician if provided
  if (clinicianId) {
    const assignedClinician = await prisma.clinicMember.findUnique({
      where: { id: clinicianId },
    });

    if (
      !assignedClinician ||
      assignedClinician.clinicId !== template.clinicId
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Clinician does not belong to this clinic"
      );
    }
  }

  // Generate share token
  const shareToken = generateShareToken();

  // Create instance
  const instance = await prisma.assessmentInstance.create({
    data: {
      templateId,
      clientId,
      clinicianId: clinicianId || null,
      assignedBy: userId,
      shareToken,
      document: documentPath,
      note,
      status: "pending",
    },
    include: {
      template: {
        include: {
          questions: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      clinician: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return instance;
};

// Share Assessment via Email
const shareAssessmentViaEmail = async (
  userId: string,
  instanceId: string,
  customMessage?: string
) => {
  const instance = await prisma.assessmentInstance.findUnique({
    where: { id: instanceId },
    include: {
      template: {
        include: {
          questions: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      client: true,
      assignedByUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!instance) {
    throw new ApiError(httpStatus.NOT_FOUND, "Assessment instance not found");
  }

  // Verify user has access
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId: instance.template.clinicId,
    },
  });

  if (!clinicMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You don't have access to this assessment"
    );
  }

  // Create share URL
  const shareUrl = `${env.FRONTEND_URL}/assessment/${instance.shareToken}`;

  // Send email
  await emailService.sendAssessmentEmail(
    instance.client.email,
    instance.template.title,
    shareUrl,
    customMessage
  );

  return { message: "Assessment shared successfully", shareUrl };
};

// Get Assessment Instance by Share Token (for patient access)
const getAssessmentByToken = async (shareToken: string) => {
  const instance = await prisma.assessmentInstance.findUnique({
    where: { shareToken },
    select: {
      id: true,
      templateId: true,
      clientId: true,
      clinicianId: true,
      status: true,
      document: true,
      note: true,
      score: true,
      maxScore: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      template: {
        select: {
          id: true,
          clinicId: true,
          createdBy: true,
          title: true,
          description: true,
          category: true,
          document: true,
          note: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          questions: {
            select: {
              id: true,
              question: true,
              type: true,
              options: true,
              order: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!instance) {
    throw new ApiError(httpStatus.NOT_FOUND, "Assessment not found");
  }

  return {
    ...instance,
    // Keep a top-level questions array for clients that don't read nested template data.
    questions: instance.template.questions,
    template: {
      ...instance.template,
      questions: instance.template.questions,
    },
  };
};

// Submit Assessment (by patient or clinician)
const submitAssessment = async (
  shareToken: string,
  submitData: ISubmitAssessment,
  submittedByClinician?: boolean,
  clinicianId?: string
) => {
  const instance = await prisma.assessmentInstance.findUnique({
    where: { shareToken },
    include: {
      template: {
        include: {
          questions: true,
        },
      },
      responses: true,
    },
  });

  if (!instance) {
    throw new ApiError(httpStatus.NOT_FOUND, "Assessment not found");
  }

  if (instance.status === "completed") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Assessment has already been completed"
    );
  }

  // Get all questions from template
  const questions = instance.template.questions;
  const questionMap = new Map(
    questions.map((q) => [
      q.id,
      { question: q.question, type: q.type, options: q.options },
    ])
  );

  validateResponseSet(submitData.responses, questions.map((q) => ({ id: q.id })));

  const standardizedScoring = scoreStandardizedAssessment(
    instance.template.title,
    submitData.responses,
    questions.map((q) => ({ id: q.id }))
  );

  let totalScore: number;
  let maxScore: number;
  let finalNote: string;
  const responsesToCreate: Array<{
    instanceId: string;
    questionId: string;
    answer: string;
    points: number;
  }> = [];

  if (standardizedScoring) {
    totalScore = standardizedScoring.totalScore;
    maxScore = standardizedScoring.maxScore;

    standardizedScoring.responsesToCreate.forEach((response) => {
      responsesToCreate.push({
        instanceId: instance.id,
        questionId: response.questionId,
        answer: response.answer,
        points: response.points,
      });
    });

    finalNote = `${instance.note || ""}\n\nStandardized Scoring (${standardizedScoring.scale.title}):\nSeverity: ${standardizedScoring.summary.severity}\nInterpretation: ${standardizedScoring.summary.interpretation}\n\nRecommendations:\n${standardizedScoring.summary.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`.trim();
  } else {
    const aiScoring = await buildAiScoringResult(
      instance.template.title,
      submitData.responses,
      questionMap,
      instance.note
    );
    totalScore = aiScoring.totalScore;
    maxScore = aiScoring.maxScore;
    aiScoring.responsesToCreate.forEach((response) => {
      responsesToCreate.push({
        instanceId: instance.id,
        questionId: response.questionId,
        answer: response.answer,
        points: response.points,
      });
    });
    finalNote = aiScoring.note;
  }

  // Update instance and create responses in a transaction
  const updatedInstance = await prisma.$transaction(async (tx) => {
    // Delete existing responses if any
    await tx.assessmentResponse.deleteMany({
      where: { instanceId: instance.id },
    });

    // Create new responses
    await tx.assessmentResponse.createMany({
      data: responsesToCreate,
    });

    // Update instance with AI-generated scores and analysis
    const updated = await tx.assessmentInstance.update({
      where: { id: instance.id },
      data: {
        status: "completed",
        score: totalScore,
        maxScore: maxScore,
        completedAt: new Date(),
        note: finalNote,
        ...(submittedByClinician && clinicianId ? { clinicianId } : {}),
      },
      include: {
        template: {
          include: {
            questions: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
        responses: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updated;
  });

  // Send notification to clinician if assessment was completed by client
  if (!submittedByClinician && updatedInstance.clinicianId) {
    try {
      const clinician = await prisma.clinicMember.findUnique({
        where: { id: updatedInstance.clinicianId },
        select: { userId: true },
      });

      if (clinician) {
        const template = getNotificationTemplate(
          "assessment" as any,
          "completed",
          `${updatedInstance.client.firstName} ${updatedInstance.client.lastName}`,
          updatedInstance.template.title
        );

        await notificationService.createNotification({
          userId: clinician.userId,
          title: template.title,
          message: template.message,
          type: "assessment" as any,
          data: {
            assessmentId: updatedInstance.id,
            clientName: `${updatedInstance.client.firstName} ${updatedInstance.client.lastName}`,
            assessmentTitle: updatedInstance.template.title,
            score: updatedInstance.score,
            maxScore: updatedInstance.maxScore,
          },
          sendPush: true,
        });
      }
    } catch (error) {
      console.error("Failed to send assessment completion notification:", error);
    }
  }

  return updatedInstance;
};

// Get Assessment Instances (for dashboard)
const getAssessmentInstances = async (
  userId: string,
  clinicId: string,
  options: any
) => {
  // Verify user has access to clinic
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId,
    },
  });

  if (!clinicMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You don't have access to this clinic"
    );
  }

  const {
    limit = 10,
    page = 1,
    sort = { createdAt: "desc" },
    clientId,
    status,
  } = options;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    template: {
      clinicId,
    },
  };

  if (clientId) {
    where.clientId = clientId;
  }

  if (status) {
    where.status = status;
  }

  const [instances, totalDocs] = await Promise.all([
    prisma.assessmentInstance.findMany({
      where,
      take,
      skip,
      orderBy: sort,
      include: {
        template: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        clinician: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        assignedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            responses: true,
          },
        },
      },
    }),
    prisma.assessmentInstance.count({ where }),
  ]);

  return {
    docs: instances,
    totalDocs,
    limit: take,
    page: Number(page),
    totalPages: Math.ceil(totalDocs / take),
  };
};

// Get Assessment Instance by ID
const getAssessmentInstanceById = async (
  userId: string,
  instanceId: string
) => {
  const instance = await prisma.assessmentInstance.findUnique({
    where: { id: instanceId },
    include: {
      template: {
        include: {
          questions: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      clinician: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      responses: {
        include: {
          question: true,
        },
      },
      assignedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!instance) {
    throw new ApiError(httpStatus.NOT_FOUND, "Assessment instance not found");
  }

  // Verify user has access
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId: instance.template.clinicId,
    },
  });

  if (!clinicMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You don't have access to this assessment"
    );
  }

  return instance;
};

// Submit Assessment by Clinician (authenticated route)
const submitAssessmentByClinician = async (
  userId: string,
  instanceId: string,
  responses: Array<{ questionId: string; answer: string }>
) => {
  const instance = await prisma.assessmentInstance.findUnique({
    where: { id: instanceId },
    include: {
      template: {
        include: {
          questions: true,
          clinic: true,
        },
      },
      responses: true,
    },
  });

  if (!instance) {
    throw new ApiError(httpStatus.NOT_FOUND, "Assessment instance not found");
  }

  // Verify clinician has access to this clinic
  const clinicMember = await prisma.clinicMember.findFirst({
    where: {
      userId,
      clinicId: instance.template.clinicId,
    },
  });

  if (!clinicMember) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You don't have access to this assessment"
    );
  }

  if (instance.status === "completed") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Assessment has already been completed"
    );
  }

  // Get all questions from template
  const questions = instance.template.questions;
  const questionMap = new Map(
    questions.map((q) => [
      q.id,
      { question: q.question, type: q.type, options: q.options, points: q.points },
    ])
  );
  validateResponseSet(responses, questions.map((q) => ({ id: q.id })));

  // Calculate score
  let totalScore = 0;
  let maxScore = 0;
  const responsesToCreate: Array<{
    instanceId: string;
    questionId: string;
    answer: string;
    points: number;
  }> = [];

  const standardizedScoring = scoreStandardizedAssessment(
    instance.template.title,
    responses,
    questions.map((q) => ({ id: q.id }))
  );

  if (standardizedScoring) {
    totalScore = standardizedScoring.totalScore;
    maxScore = standardizedScoring.maxScore;

    standardizedScoring.responsesToCreate.forEach((response) => {
      responsesToCreate.push({
        instanceId: instance.id,
        questionId: response.questionId,
        answer: response.answer,
        points: response.points,
      });
    });
  } else {
    const aiScoring = await buildAiScoringResult(
      instance.template.title,
      responses,
      new Map(
        questions.map((q) => [
          q.id,
          { question: q.question, type: q.type, options: q.options },
        ])
      )
    );
    totalScore = aiScoring.totalScore;
    maxScore = aiScoring.maxScore;
    aiScoring.responsesToCreate.forEach((response) => {
      responsesToCreate.push({
        instanceId: instance.id,
        questionId: response.questionId,
        answer: response.answer,
        points: response.points,
      });
    });
  }

  // Update instance and create responses in a transaction
  const updatedInstance = await prisma.$transaction(async (tx) => {
    // Delete existing responses if any
    await tx.assessmentResponse.deleteMany({
      where: { instanceId: instance.id },
    });

    // Create new responses
    await tx.assessmentResponse.createMany({
      data: responsesToCreate,
    });

    // Update instance - mark as completed by clinician
    const updated = await tx.assessmentInstance.update({
      where: { id: instance.id },
      data: {
        status: "completed",
        score: totalScore,
        maxScore: maxScore,
        completedAt: new Date(),
        clinicianId: clinicMember.id,
      },
      include: {
        template: {
          include: {
            questions: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        clinician: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return updated;
  });

  return updatedInstance;
};

export default {
  createAssessmentTemplate,
  getAssessmentTemplates,
  getAssessmentTemplateById,
  updateAssessmentTemplate,
  deleteAssessmentTemplate,
  createAssessmentInstance,
  getAssessmentInstances,
  getAssessmentInstanceById,
  getAssessmentByToken,
  submitAssessment,
  submitAssessmentByClinician,
  shareAssessmentViaEmail,
  getClientProgress,
};
