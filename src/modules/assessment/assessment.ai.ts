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
  const systemPrompt = `You are an experienced clinician creating educational assessments for your clinic. Your role is to:
- Design clinically relevant, evidence-based questions that help assess healthcare professionals' knowledge
- Create questions based on current clinical guidelines and best practices
- Ensure questions are practical and applicable to real-world clinical scenarios
- Focus on patient safety, diagnostic accuracy, and treatment protocols
- Write clear, unambiguous questions that test critical thinking

Your assessments should reflect the knowledge needed for competent clinical practice.`;

  const userPrompt = `Generate a clinical assessment quiz on the topic: "${topic}".

Create 5 multiple-choice questions with 4 options each. Return ONLY valid JSON in this exact format:

{
  "topic": "${topic}",
  "difficulty": "intermediate",
  "estimatedTime": 8,
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Requirements:
- Questions should be clinically relevant and evidence-based
- Options should be plausible and challenging
- correctAnswer is the index (0-3) of the correct option
- Include brief explanations for educational value
- Return ONLY the JSON object, no markdown formatting or additional text`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
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
