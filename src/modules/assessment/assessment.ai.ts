import aiClient from "../../configs/ai";

interface AssessmentQuestion {
  id: number;
  question: string;
  options: string[];
  explanation?: string;
}

interface AssessmentResponse {
  topic: string;
  questions: AssessmentQuestion[];
  difficulty?: string;
  estimatedTime?: number; // in minutes
}

interface AssessmentAnalysis {
  totalScore: number;
  maxScore: number;
  severity: "low" | "moderate" | "high" | "critical";
  summary: string;
  recommendations: string[];
  responsesAnalysis: Array<{
    questionId: string;
    points: number;
    analysis: string;
  }>;
}

interface StandardizedScaleRule {
  name: string;
  aliases: string[];
  expectedQuestionCount: number;
  expectedOptions?: string[];
}

const STANDARDIZED_SCALE_RULES: StandardizedScaleRule[] = [
  {
    name: "PHQ-9",
    aliases: ["phq9", "phq-9", "patient health questionnaire 9"],
    expectedQuestionCount: 9,
    expectedOptions: [
      "Not at all",
      "Several days",
      "More than half the days",
      "Nearly every day",
    ],
  },
  {
    name: "PHQ-2",
    aliases: ["phq2", "phq-2", "patient health questionnaire 2"],
    expectedQuestionCount: 2,
    expectedOptions: [
      "Not at all",
      "Several days",
      "More than half the days",
      "Nearly every day",
    ],
  },
  {
    name: "GAD-7",
    aliases: ["gad7", "gad-7", "generalized anxiety disorder 7"],
    expectedQuestionCount: 7,
    expectedOptions: [
      "Not at all",
      "Several days",
      "More than half the days",
      "Nearly every day",
    ],
  },
  {
    name: "GAD-2",
    aliases: ["gad2", "gad-2", "generalized anxiety disorder 2"],
    expectedQuestionCount: 2,
    expectedOptions: [
      "Not at all",
      "Several days",
      "More than half the days",
      "Nearly every day",
    ],
  },
];

const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const detectStandardizedScaleRule = (topic: string): StandardizedScaleRule | null => {
  const normalizedTopic = normalizeText(topic);

  for (const rule of STANDARDIZED_SCALE_RULES) {
    const matched = rule.aliases.some((alias) =>
      normalizedTopic.includes(normalizeText(alias))
    );
    if (matched) {
      return rule;
    }
  }

  return null;
};

const normalizeAssessmentResponse = (
  topic: string,
  payload: AssessmentResponse
): AssessmentResponse => {
  const cleanedQuestions = (payload.questions || [])
    .filter((q) => q?.question && typeof q.question === "string")
    .map((q, index) => ({
      id: index + 1,
      question: q.question.trim(),
      options: Array.isArray(q.options)
        ? q.options.map((option) => String(option).trim()).filter(Boolean)
        : [],
      explanation: q.explanation?.trim(),
    }));

  return {
    topic: (payload.topic || topic).trim(),
    estimatedTime: payload.estimatedTime || 5,
    questions: cleanedQuestions,
    difficulty: payload.difficulty,
  };
};

const validateAssessmentForScaleRule = (
  assessment: AssessmentResponse,
  rule: StandardizedScaleRule | null
): { valid: boolean; reason?: string } => {
  if (!rule) {
    return { valid: true };
  }

  if (assessment.questions.length !== rule.expectedQuestionCount) {
    return {
      valid: false,
      reason: `Expected ${rule.expectedQuestionCount} questions for ${rule.name}, but got ${assessment.questions.length}.`,
    };
  }

  if (rule.expectedOptions) {
    const invalidQuestion = assessment.questions.find((question) => {
      if (question.options.length !== rule.expectedOptions!.length) {
        return true;
      }

      return rule.expectedOptions!.some(
        (option, index) => option !== question.options[index]
      );
    });

    if (invalidQuestion) {
      return {
        valid: false,
        reason: `Response options must exactly match ${rule.expectedOptions.join(", ")} for every ${rule.name} item.`,
      };
    }
  }

  return { valid: true };
};

const createAssessmentAi = async (
  topic: string,
): Promise<AssessmentResponse> => {
  const systemPrompt = `You are a healthcare professional creating patient intake assessments. Your role is to:
- Create questions that help clinicians understand patient symptoms, conditions, and health status
- Ask about relevant symptoms, severity, frequency, and impact on daily life
- Include questions about medical history, current medications, and lifestyle factors
- Use clear, patient-friendly language
- Focus on gathering clinically useful information for diagnosis and treatment

These are NOT educational quizzes - they are health intake forms for patients to complete.

Critical rule for named validated scales:
- If the user topic asks for a known standardized tool (example: PHQ-9, GAD-7, PHQ-2, GAD-2), return the exact canonical question wording and exact question count for that tool.
- Do not paraphrase standardized items.
- Use the standard response options for that scale.

For non-standard/custom topics, create clinically useful custom intake questions.`;

  const userPrompt = `Create a patient assessment form about: "${topic}".

Generate assessment questions for topic: "${topic}".

Return ONLY valid JSON in this exact format:

{
  "topic": "${topic}",
  "estimatedTime": 5,
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    },
    {
      "id": 2,
      "question": "Free text question",
      "options": [],
    }
  ]
}

Requirements:
- If "${topic}" maps to a standardized validated scale, return exact canonical items for that scale.
- If not standardized, create 5-7 high-quality intake questions.
- Use patient-friendly language (avoid medical jargon)
- For custom assessments, ask about severity, frequency, duration, triggers, and impact.
- For custom assessments, include at least 1-2 text questions for detailed responses.
- Keep questions clear and concise
- Focus on information clinicians need for assessment
- Output must always be valid JSON with sequential ids starting from 1.
- Return ONLY the JSON object, no markdown or extra text`;

  const scaleRule = detectStandardizedScaleRule(topic);

  const generateAssessment = async (prompt: string) => {
    const assessmentData = await aiClient.generateJson<AssessmentResponse>({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    });

    return normalizeAssessmentResponse(topic, assessmentData);
  };

  const firstAttempt = await generateAssessment(userPrompt);
  const firstValidation = validateAssessmentForScaleRule(firstAttempt, scaleRule);
  if (firstValidation.valid) {
    return firstAttempt;
  }

  const retryPrompt = `${userPrompt}

IMPORTANT CORRECTION:
- Your previous output was invalid: ${firstValidation.reason}
- Regenerate now and strictly follow the standardized scale constraints.`;

  const secondAttempt = await generateAssessment(retryPrompt);
  const secondValidation = validateAssessmentForScaleRule(secondAttempt, scaleRule);
  if (secondValidation.valid) {
    return secondAttempt;
  }

  throw new Error(
    `Failed to generate a valid ${scaleRule?.name || "assessment"} after retry: ${secondValidation.reason}`
  );
};

const analyzeAssessmentResponses = async (
  assessmentTitle: string,
  questionsAndAnswers: Array<{
    question: string;
    type: string;
    answer: string;
    options?: any;
  }>
): Promise<AssessmentAnalysis> => {
  const systemPrompt = `You are a healthcare professional analyzing patient assessment responses. Your role is to:
- Evaluate the severity and urgency of reported symptoms
- Assign appropriate points based on clinical significance
- Provide a clear summary of the patient's condition
- Offer relevant recommendations for the clinician
- Use clinical judgment to assess risk levels

Be objective, thorough, and focus on clinically relevant insights.`;

  const questionsText = questionsAndAnswers
    .map((qa, idx) => {
      let optionsText = "";
      if (qa.options && Array.isArray(qa.options) && qa.options.length > 0) {
        optionsText = `\nOptions: ${qa.options.join(", ")}`;
      }
      return `${idx + 1}. ${qa.question}${optionsText}\nAnswer: ${qa.answer}`;
    })
    .join("\n\n");

  const userPrompt = `Analyze this patient assessment for "${assessmentTitle}":

${questionsText}

Provide a clinical analysis with scoring. Return ONLY valid JSON in this exact format:

{
  "totalScore": 75,
  "maxScore": 100,
  "severity": "moderate",
  "summary": "Brief clinical summary of the patient's condition based on responses",
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3"
  ],
  "responsesAnalysis": [
    {
      "questionId": "0",
      "points": 15,
      "analysis": "Brief analysis of this specific response"
    }
  ]
}

Scoring guidelines:
- Assign points (0-20) per question based on clinical significance
- Higher points indicate more concerning symptoms or higher severity
- Consider frequency, duration, intensity, and impact on daily life
- Total score should reflect overall condition severity

Severity levels:
- "low": Mild symptoms, minimal impact (0-40 points)
- "moderate": Noticeable symptoms, some impact (41-70 points)
- "high": Significant symptoms, considerable impact (71-85 points)
- "critical": Severe symptoms, major impact, urgent attention needed (86-100 points)

Return ONLY the JSON object, no markdown or extra text.`;

  const analysis = await aiClient.generateJson<AssessmentAnalysis>({
    model: "gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.3, // Lower temperature for more consistent scoring
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  });

  return analysis;
};

export default createAssessmentAi;
export { analyzeAssessmentResponses };
