import { afterEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

import { explainIncorrectAnswer, generateQuizDraft, recommendNextSteps } from "@/lib/ai/provider";

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.GEMINI_API_KEY;
});

describe("Gemini learning provider", () => {
  it("returns validated Gemini explanations when the provider responds with JSON", async () => {
    process.env.GEMINI_API_KEY = "test-only-key";
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ explanation: "A clear explanation that is long enough for validation.", nextStep: "Try one fresh example about this concept." }) });
    const result = await explainIncorrectAnswer({ concept: "loops", prompt: "Which loop repeats?", selected: "A", correct: "B" });
    expect(result.source).toBe("gemini");
    expect(result.data.explanation).toContain("clear explanation");
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("uses a labeled fallback when no API key is configured", async () => {
    const result = await recommendNextSteps(["loops", "functions"]);
    expect(result.source).toBe("fallback");
    expect(result.warning).toContain("not configured");
    expect(result.data.actions.length).toBeGreaterThan(0);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("uses a labeled fallback when Gemini returns malformed content", async () => {
    process.env.GEMINI_API_KEY = "test-only-key";
    generateContent.mockResolvedValueOnce({ text: "not-json" });
    const result = await generateQuizDraft("functions", 2);
    expect(result.source).toBe("fallback");
    expect(result.warning).toContain("temporarily unavailable");
    expect(result.data.questions).toHaveLength(1);
  });
});
