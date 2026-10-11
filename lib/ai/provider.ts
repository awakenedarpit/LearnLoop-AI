import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const MAX_PROMPT_CHARS = 4_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 1;

export type AiResult<T> = {
  data: T;
  source: "gemini" | "fallback";
  warning?: string;
};

export const explanationSchema = z.object({
  explanation: z.string().min(20).max(1_200),
  nextStep: z.string().min(10).max(400),
});
export type Explanation = z.infer<typeof explanationSchema>;

export const recommendationSchema = z.object({
  headline: z.string().min(10).max(160),
  actions: z.array(z.string().min(10).max(300)).min(1).max(3),
});
export type Recommendation = z.infer<typeof recommendationSchema>;

export const quizDraftSchema = z.object({
  questions: z.array(z.object({
    prompt: z.string().min(5).max(600),
    options: z.array(z.string().min(1).max(240)).length(4),
    correctOptionIndex: z.number().int().min(0).max(3),
    explanation: z.string().min(10).max(800),
    concept: z.string().min(1).max(80),
  })).min(1).max(10),
});
export type QuizDraft = z.infer<typeof quizDraftSchema>;

const jsonSchema = {
  explanation: { type: "string" },
  nextStep: { type: "string" },
};
const recommendationJsonSchema = {
  headline: { type: "string" },
  actions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
};
const quizDraftJsonSchema = {
  questions: {
    type: "array", minItems: 1, maxItems: 10,
    items: { type: "object", properties: {
      prompt: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
      correctOptionIndex: { type: "integer", minimum: 0, maximum: 3 }, explanation: { type: "string" }, concept: { type: "string" },
    }, required: ["prompt", "options", "correctOptionIndex", "explanation", "concept"], additionalProperties: false },
  },
};

type GenerateArgs<T> = { prompt: string; schema: unknown; parse: (value: unknown) => T };

function fallbackExplanation(concept: string, selected: string, correct: string): Explanation {
  return {
    explanation: `The key idea in ${concept} is to check what the code or question is asking before choosing an answer. You selected “${selected}”, while the verified answer is “${correct}”. Compare the two choices and identify the rule that makes “${correct}” fit the example.`,
    nextStep: `Review one short example about ${concept}, then try a fresh practice question without looking at the answer first.`,
  };
}

function fallbackRecommendation(concepts: string[]): Recommendation {
  const focus = concepts.length ? concepts.slice(0, 2).join(" and ") : "the concepts you find least certain";
  return {
    headline: `Build your next loop around ${focus}.`,
    actions: [
      `Practice one fresh question about ${focus}.`,
      "Write down why the correct answer works before checking the explanation.",
      "Reassess after practice and compare the saved results honestly.",
    ],
  };
}

function fallbackQuizDraft(topic: string): QuizDraft {
  return { questions: [{
    prompt: `Which statement best describes ${topic}?`,
    options: [`A useful definition of ${topic}`, "An unrelated statement", "A common misconception", "A statement with no example"],
    correctOptionIndex: 0,
    explanation: `The first option is the draft answer because it directly describes ${topic}. A teacher must review and edit this question before publishing.`,
    concept: topic,
  }] };
}

function configured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

async function generateJson<T>({ prompt, schema, parse }: GenerateArgs<T>): Promise<T> {
  if (prompt.length > MAX_PROMPT_CHARS) throw new Error("AI_INPUT_TOO_LARGE");
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AI_TIMEOUT")), REQUEST_TIMEOUT_MS);
    });
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: schema,
            maxOutputTokens: 900,
            temperature: 0.3,
          },
        }),
        timeout,
      ]);
      const text = response.text?.trim();
      if (!text) throw new Error("AI_EMPTY_RESPONSE");
      return parse(JSON.parse(text));
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES && (error instanceof Error && /429|5\d\d|quota|rate/i.test(error.message))) continue;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI_PROVIDER_FAILED");
}

export async function explainIncorrectAnswer(input: { concept: string; prompt: string; selected: string; correct: string }): Promise<AiResult<Explanation>> {
  const safe = { concept: input.concept.slice(0, 120), prompt: input.prompt.slice(0, 800), selected: input.selected.slice(0, 240), correct: input.correct.slice(0, 240) };
  const fallback = fallbackExplanation(safe.concept, safe.selected, safe.correct);
  try {
    const data = await generateJson({
      prompt: `You are a supportive Python tutor. Explain one incorrect multiple-choice answer in plain language. Do not change the verified answer. Do not claim the learner's score changed. Return concise JSON.\nConcept: ${safe.concept}\nQuestion: ${safe.prompt}\nLearner answer: ${safe.selected}\nVerified answer: ${safe.correct}`,
      schema: jsonSchema,
      parse: (value) => explanationSchema.parse(value),
    });
    return { data, source: "gemini" };
  } catch {
    return { data: fallback, source: "fallback", warning: configured() ? "Gemini is temporarily unavailable; this is a curated fallback." : "Gemini is not configured; this is a curated fallback." };
  }
}

export async function recommendNextSteps(concepts: string[]): Promise<AiResult<Recommendation>> {
  const safeConcepts = concepts.slice(0, 6).map((concept) => concept.slice(0, 80));
  try {
    const data = await generateJson({
      prompt: `You are a learning coach. Give a short actionable plan for a student whose weakest Python concepts are ${safeConcepts.join(", ") || "not yet assessed"}. Do not invent scores or learner facts. Return JSON.`,
      schema: recommendationJsonSchema,
      parse: (value) => recommendationSchema.parse(value),
    });
    return { data, source: "gemini" };
  } catch {
    return { data: fallbackRecommendation(safeConcepts), source: "fallback", warning: configured() ? "Gemini is temporarily unavailable; this is a curated fallback." : "Gemini is not configured; this is a curated fallback." };
  }
}

export async function generateQuizDraft(topic: string, count: number): Promise<AiResult<QuizDraft>> {
  const safeTopic = topic.trim().slice(0, 120) || "Python fundamentals";
  const safeCount = Math.min(Math.max(Math.floor(count), 1), 10);
  try {
    const data = await generateJson({
      prompt: `Create ${safeCount} multiple-choice draft questions for a teacher about ${safeTopic}. Each question must have exactly four options, one verified correctOptionIndex, a concise explanation, and a concept tag. These are drafts only and must be reviewed by a teacher before publication. Return JSON.`,
      schema: quizDraftJsonSchema,
      parse: (value) => quizDraftSchema.parse(value),
    });
    return { data, source: "gemini" };
  } catch {
    return { data: fallbackQuizDraft(safeTopic), source: "fallback", warning: configured() ? "Gemini is temporarily unavailable; a clearly marked starter draft was returned." : "Gemini is not configured; a clearly marked starter draft was returned." };
  }
}
