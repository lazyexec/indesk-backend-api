export interface IAssessmentTemplate {
  clinicId: string;
  title: string;
  description?: string;
  category?: "general_clinical" | "mental_health" | "physical_therapy" | "neurology";
  questions: IAssessmentQuestion[];
}

export interface IAssessmentQuestion {
  question: string;
  type: "text" | "multiple_choice" | "yes_no";
  options?: string[];
  correctAnswer?: string;
  points?: number;
  order?: number;
}

export interface ICreateAssessmentInstance {
  templateId: string;
  clientId: string;
  clinicianId?: string;
  document?: string;
  note?: string;
}

export interface IAssessmentResponse {
  questionId: string;
  answer: string;
}

export interface ISubmitAssessment {
  responses: IAssessmentResponse[];
}
