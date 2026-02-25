import { GoogleGenerativeAI } from "@google/generative-ai";

interface AssessmentQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  explanation?: string;
}

interface AssessmentResponse {
  topic: string;
  questions: AssessmentQuestion[];
  difficulty?: string;
  estimatedTime?: number; // in minutes
}

const createAssessmentAi = async (
  topic: string,
): Promise<AssessmentResponse> => {
  const systemPrompt = `You are a healthcare professional creating patient intake assessments. Your role is to:
- Create questions that help clinicians understand patient symptoms, conditions, and health status
- Ask about relevant symptoms, severity, frequency, and impact on daily life
- Include questions about medical history, current medications, and lifestyle factors
- Use clear, patient-friendly language
- Focus on gathering clinically useful information for diagnosis and treatment

These are NOT educational quizzes - they are health intake forms for patients to complete.`;

  const userPrompt = `Create a patient assessment form about: "${topic}".

Generate 5-7 questions to help clinicians understand the patient's condition related to ${topic}. Mix question types appropriately.

Return ONLY valid JSON in this exact format:

{
  "topic": "${topic}",
  "estimatedTime": 5,
  "questions": [
    {
      "id": 1,
      "question": "How long have you been experiencing symptoms related to ${topic}?",
      "options": ["Less than 1 week", "1-4 weeks", "1-3 months", "More than 3 months"],
      "correctAnswer": 0
    },
    {
      "id": 2,
      "question": "Please describe your main symptoms in detail",
      "options": [],
      "correctAnswer": 0
    }
  ]
}

Question types to use:
- Multiple choice for severity, frequency, duration (include 4 options)
- Text questions for detailed symptom descriptions (empty options array)
- Yes/No questions for specific symptoms or history (2 options: "Yes", "No")

Requirements:
- Questions must be DIRECTLY about ${topic} and related symptoms
- Use patient-friendly language (avoid medical jargon)
- Ask about symptom severity, frequency, duration, triggers
- Include at least 1-2 text questions for detailed responses
- Keep questions clear and concise
- Focus on information clinicians need for assessment
- Return ONLY the JSON object, no markdown or extra text`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const text = result.response.text();
  const cleanedText = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const assessmentData: AssessmentResponse = JSON.parse(cleanedText);

  return assessmentData;
};

export default createAssessmentAi;
