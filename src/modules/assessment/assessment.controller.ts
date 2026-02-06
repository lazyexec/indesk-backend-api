import catchAsync from "../../utils/catchAsync";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import AssessmentService from "./assessment.service";
import response from "../../utils/response";
import pick from "../../utils/pick";
import clinicService from "../clinic/clinic.service";
import createAssessmentAi from "./assessment.ai";

// Template Controllers
const createAssessmentTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const clinicId = await clinicService.getClinicIdByUserId(userId);

    if (!clinicId) {
      return res.status(httpStatus.BAD_REQUEST).json(
        response({
          status: httpStatus.BAD_REQUEST,
          message: "User is not associated with a clinic",
        })
      );
    }

    const template = await AssessmentService.createAssessmentTemplate(
      userId,
      clinicId,
      req.body
    );
    res.status(httpStatus.CREATED).json(
      response({
        status: httpStatus.CREATED,
        message: "Assessment template created successfully",
        data: template,
      })
    );
  }
);

const getAssessmentTemplates = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const clinicId = await clinicService.getClinicIdByUserId(userId);

    if (!clinicId) {
      return res.status(httpStatus.BAD_REQUEST).json(
        response({
          status: httpStatus.BAD_REQUEST,
          message: "User is not associated with a clinic",
        })
      );
    }

    const filter = pick(req.query, ["category"]);
    const options = pick(req.query, ["limit", "page", "sort"]);
    const result = await AssessmentService.getAssessmentTemplates(
      userId,
      clinicId,
      { ...filter, ...options }
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Assessment templates retrieved successfully",
        data: result,
      })
    );
  }
);

const getAssessmentTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const template = await AssessmentService.getAssessmentTemplateById(
      userId,
      req.params.templateId
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Assessment template retrieved successfully",
        data: template,
      })
    );
  }
);

const updateAssessmentTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const template = await AssessmentService.updateAssessmentTemplate(
      userId,
      req.params.templateId,
      req.body
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Assessment template updated successfully",
        data: template,
      })
    );
  }
);

const deleteAssessmentTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    await AssessmentService.deleteAssessmentTemplate(
      userId,
      req.params.templateId
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Assessment template deleted successfully",
      })
    );
  }
);

// Instance Controllers
const createAssessmentInstance = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const instance = await AssessmentService.createAssessmentInstance(
      userId,
      req.body
    );
    res.status(httpStatus.CREATED).json(
      response({
        status: httpStatus.CREATED,
        message: "Assessment instance created successfully",
        data: instance,
      })
    );
  }
);

const shareAssessmentViaEmail = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const result = await AssessmentService.shareAssessmentViaEmail(
      userId,
      req.params.instanceId,
      req.body.message
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Assessment shared successfully",
        data: result,
      })
    );
  }
);

const getAssessmentByToken = catchAsync(async (req: Request, res: Response) => {
  const assessment = await AssessmentService.getAssessmentByToken(
    req.params.token
  );
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Assessment retrieved successfully",
      data: assessment,
    })
  );
});

const submitAssessment = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { submittedByClinician, clinicianId } = req.body;
  const assessment = await AssessmentService.submitAssessment(
    token,
    req.body,
    submittedByClinician,
    clinicianId
  );
  res.status(httpStatus.OK).json(
    response({
      status: httpStatus.OK,
      message: "Assessment submitted successfully",
      data: assessment,
    })
  );
});

const getAssessmentInstances = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const clinicId = await clinicService.getClinicIdByUserId(userId);

    if (!clinicId) {
      return res.status(httpStatus.BAD_REQUEST).json(
        response({
          status: httpStatus.BAD_REQUEST,
          message: "User is not associated with a clinic",
        })
      );
    }

    const filter = pick(req.query, ["clientId", "status"]);
    const options = pick(req.query, ["limit", "page", "sort"]);
    const result = await AssessmentService.getAssessmentInstances(
      userId,
      clinicId,
      { ...filter, ...options }
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Assessment instances retrieved successfully",
        data: result,
      })
    );
  }
);

const getAssessmentInstance = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const instance = await AssessmentService.getAssessmentInstanceById(
      userId,
      req.params.instanceId
    );
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Assessment instance retrieved successfully",
        data: instance,
      })
    );
  }
);

const createAssessmentWithAi = catchAsync(
  async (req: Request, res: Response) => {
    const { topic } = req.body;
    const assessment = await createAssessmentAi(topic);
    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "AI assessment generated successfully",
        data: assessment,
      })
    );
  }
);

const submitAssessmentByClinician = catchAsync(
  async (req: Request, res: Response) => {
    const userId: string = req.user?.id!;
    const { instanceId } = req.params;
    const { responses } = req.body;

    const assessment = await AssessmentService.submitAssessmentByClinician(
      userId,
      instanceId,
      responses
    );

    res.status(httpStatus.OK).json(
      response({
        status: httpStatus.OK,
        message: "Assessment completed successfully by clinician",
        data: assessment,
      })
    );
  }
);

export default {
  createAssessmentTemplate,
  getAssessmentTemplates,
  getAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate,
  createAssessmentInstance,
  shareAssessmentViaEmail,
  getAssessmentByToken,
  submitAssessment,
  getAssessmentInstances,
  getAssessmentInstance,
  createAssessmentWithAi,
  submitAssessmentByClinician,
};
