import { Request, Response } from "express";
import httpStatus from "http-status";
import aiAssistantService from "./ai-assistant.service";
import ApiError from "../../utils/ApiError";
import catchAsync from "../../utils/catchAsync";
import response from "../../utils/response";

interface AuthenticatedRequest extends Request {
    user?: any;
}

const chat = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
    }

    if (!req.user.clinicId) {
        throw new ApiError(httpStatus.FORBIDDEN, "No clinic access");
    }

    const result = await aiAssistantService.chat(
        req.user.id,
        req.user.clinicId,
        req.body
    );

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Chat response generated successfully",
            data: result,
        })
    );
});

const draftEmail = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
    }

    if (!req.user.clinicId) {
        throw new ApiError(httpStatus.FORBIDDEN, "No clinic access");
    }

    const result = await aiAssistantService.draftEmail(
        req.user.id,
        req.user.clinicId,
        req.body
    );

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Email drafted successfully",
            data: result,
        })
    );
});

const summarizeSchedule = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
    }

    if (!req.user.clinicId) {
        throw new ApiError(httpStatus.FORBIDDEN, "No clinic access");
    }

    const result = await aiAssistantService.summarizeSchedule(
        req.user.id,
        req.user.clinicId,
        req.body
    );

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Schedule summarized successfully",
            data: result,
        })
    );
});

const createInvoice = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
    }

    if (!req.user.clinicId) {
        throw new ApiError(httpStatus.FORBIDDEN, "No clinic access");
    }

    const result = await aiAssistantService.createInvoice(
        req.user.id,
        req.user.clinicId,
        req.body
    );

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Invoice data generated successfully",
            data: result,
        })
    );
});

const getSuggestions = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
    }

    if (!req.user.clinicId) {
        throw new ApiError(httpStatus.FORBIDDEN, "No clinic access");
    }

    const result = await aiAssistantService.getSuggestions(
        req.user.id,
        req.user.clinicId,
        req.query
    );

    res.status(httpStatus.OK).json(
        response({
            status: httpStatus.OK,
            message: "Suggestions retrieved successfully",
            data: result,
        })
    );
});

export default {
    chat,
    draftEmail,
    summarizeSchedule,
    createInvoice,
    getSuggestions,
};
