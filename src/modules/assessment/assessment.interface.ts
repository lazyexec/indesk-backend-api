export interface IAssessmentTemplate {
  clinicId: string;
  title: string;
  description?: string;
  questions: IAssessmentQuestion[];
}

export interface IAssessmentQuestion {
  question: string;
  type: "text" | "multiple_choice";
  options?: string[];
  correctAnswer?: string;
  points?: number;
  order?: number;
}

export interface ICreateAssessmentInstance {
  templateId: string;
  clientId: string;
  clinicianId?: string;
}

export interface IAssessmentResponse {
  questionId: string;
  answer: string;
}

export interface ISubmitAssessment {
  responses: IAssessmentResponse[];
}
