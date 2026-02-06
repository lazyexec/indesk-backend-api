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

  const { title, description, questions } = templateData;

  // Create template with questions
  const template = await prisma.assessmentTemplate.create({
    data: {
      clinicId,
      createdBy: userId,
      title,
      description,
      questions: {
        create: questions.map((q, index) => ({
          question: q.question,
          type: q.type,
          options: q.options ? (q.options as any) : undefined,
          correctAnswer: undefined, // Not needed - completion-based scoring
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
            correctAnswer: undefined, // Not needed - completion-based scoring
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

  await prisma.assessmentTemplate.delete({
    where: { id: templateId },
  });
};

// Create Assessment Instance (Assign to patient)
const createAssessmentInstance = async (
  userId: string,
  instanceData: ICreateAssessmentInstance
) => {
  const { templateId, clientId, clinicianId } = instanceData;

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
    },
  });

  if (!instance) {
    throw new ApiError(httpStatus.NOT_FOUND, "Assessment not found");
  }

  // Don't include correct answers for patient view
  const questionsWithoutAnswers = instance.template.questions.map((q) => ({
    id: q.id,
    question: q.question,
    type: q.type,
    options: q.options,
    order: q.order,
  }));

  return {
    ...instance,
    template: {
      ...instance.template,
      questions: questionsWithoutAnswers,
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
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Validate all questions are answered
  if (submitData.responses.length !== questions.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "All questions must be answered"
    );
  }

  // Calculate score
  let totalScore = 0;
  let maxScore = 0;
  const responsesToCreate: Array<{
    instanceId: string;
    questionId: string;
    answer: string;
    isCorrect: boolean | null;
    points: number;
  }> = [];

  for (const response of submitData.responses) {
    const question = questionMap.get(response.questionId);
    if (!question) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Question ${response.questionId} not found`
      );
    }

    maxScore += question.points;

    // Give points for any answer (completion-based scoring)
    const pointsEarned = question.points;
    totalScore += pointsEarned;

    responsesToCreate.push({
      instanceId: instance.id,
      questionId: response.questionId,
      answer: response.answer,
      isCorrect: null, // Not tracking correctness anymore
      points: pointsEarned,
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

    // Update instance
    const updated = await tx.assessmentInstance.update({
      where: { id: instance.id },
      data: {
        status: "completed",
        score: totalScore,
        maxScore: maxScore,
        completedAt: new Date(),
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
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Validate all questions are answered
  if (responses.length !== questions.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "All questions must be answered"
    );
  }

  // Calculate score
  let totalScore = 0;
  let maxScore = 0;
  const responsesToCreate: Array<{
    instanceId: string;
    questionId: string;
    answer: string;
    isCorrect: boolean | null;
    points: number;
  }> = [];

  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Question ${response.questionId} not found`
      );
    }

    maxScore += question.points;

    // Give points for any answer (completion-based scoring)
    const pointsEarned = question.points;
    totalScore += pointsEarned;

    responsesToCreate.push({
      instanceId: instance.id,
      questionId: response.questionId,
      answer: response.answer,
      isCorrect: null,
      points: pointsEarned,
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
  shareAssessmentViaEmail,
  getAssessmentByToken,
  submitAssessment,
  getAssessmentInstances,
  getAssessmentInstanceById,
  submitAssessmentByClinician,
};
